-- Profile photos: a private Storage bucket plus a table of what each photo is.
--
-- The bucket is private. Photos are served through short-lived signed URLs,
-- and a signed URL can only be minted by someone the SELECT policy below lets
-- read the object: a signed-in member who can see that profile. A public
-- bucket would put every photo on an unauthenticated, permanent URL, and a
-- block could not take it back.
--
-- Orphans. Supabase forbids deleting storage.objects rows in SQL, and doing it
-- anyway would leave the file itself behind in the bucket, so the database
-- cannot delete a file. The dependency therefore runs the other way: a photo
-- is deleted by removing its object through the Storage API, and the trigger
-- at the bottom of this file removes the matching profile_photos row (and
-- clears a bowtie that pointed at it). Clients have no DELETE on
-- profile_photos, so a row can never be deleted out from under its file.
-- A row cannot be inserted before its file exists either.
--
-- Not covered here: deleting an account cascades its rows away but cannot
-- remove its files. Account deletion has to empty the person's folder through
-- the Storage API first; docs/DESIGN.md tracks it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos', 'profile-photos', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

-- The owner of an object named {user_id}/{uuid}.{ext}, or null for any other name.
create function private.folder_owner(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when object_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
    then split_part(object_name, '/', 1)::uuid
  end;
$$;

revoke execute on function private.folder_owner(text) from public;
grant execute on function private.folder_owner(text) to authenticated;

create table public.profile_photos (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  caption      text,
  position     smallint not null default 0,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint profile_photos_path_in_own_folder check (split_part(storage_path, '/', 1) = profile_id::text),
  constraint profile_photos_caption_length check (char_length(caption) <= 140),
  constraint profile_photos_position_nonnegative check (position >= 0)
);

create unique index profile_photos_one_primary_idx
  on public.profile_photos (profile_id) where is_primary;
create index profile_photos_profile_position_idx
  on public.profile_photos (profile_id, position);

create trigger profile_photos_set_updated_at
  before update on public.profile_photos
  for each row execute function private.set_updated_at();

-- Setting a new primary demotes the old one first, so "set primary" is a
-- single update from the client and the unique index never trips.
create function private.profile_photos_single_primary()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.profile_photos
     set is_primary = false
   where profile_id = new.profile_id
     and is_primary
     and id <> new.id;
  return new;
end;
$$;

revoke execute on function private.profile_photos_single_primary() from public;

create trigger profile_photos_single_primary
  before insert or update of is_primary on public.profile_photos
  for each row when (new.is_primary)
  execute function private.profile_photos_single_primary();

alter table public.profile_photos enable row level security;

revoke all on public.profile_photos from anon, authenticated;
grant select on public.profile_photos to authenticated;
grant insert (profile_id, storage_path, caption, position, is_primary)
  on public.profile_photos to authenticated;
grant update (caption, position, is_primary)
  on public.profile_photos to authenticated;

-- The profiles policy decides: visible, onboarded, unblocked, or your own.
create policy "profile_photos: see photos of profiles you can see"
  on public.profile_photos for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = profile_id));

create policy "profile_photos: add to your own profile once uploaded"
  on public.profile_photos for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = 'profile-photos' and o.name = storage_path
    )
  );

create policy "profile_photos: edit your own"
  on public.profile_photos for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- Storage. Writes only inside your own {user_id}/ folder, named {uuid}.{ext}.
create policy "profile-photos: read if you can see the profile"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and exists (select 1 from public.profiles p where p.id = private.folder_owner(name))
  );

create policy "profile-photos: upload into your own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  );

create policy "profile-photos: replace within your own folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  );

create policy "profile-photos: delete from your own folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Keep rows in step with objects: removed object, removed row; moved object,
-- moved path.
create function private.sync_profile_photo_objects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.bucket_id <> 'profile-photos' then
    return null;
  end if;

  if tg_op = 'DELETE' or new.bucket_id <> 'profile-photos' then
    delete from public.profile_photos where storage_path = old.name;
    update public.profiles
       set bowtie_image_path = null
     where id = private.folder_owner(old.name)
       and bowtie_image_path = old.name;
  elsif new.name <> old.name then
    update public.profile_photos set storage_path = new.name where storage_path = old.name;
    update public.profiles
       set bowtie_image_path = new.name
     where id = private.folder_owner(old.name)
       and bowtie_image_path = old.name;
  end if;
  return null;
end;
$$;

revoke execute on function private.sync_profile_photo_objects() from public;

create trigger profile_photos_sync_on_object_delete
  after delete on storage.objects
  for each row execute function private.sync_profile_photo_objects();

create trigger profile_photos_sync_on_object_move
  after update of name, bucket_id on storage.objects
  for each row execute function private.sync_profile_photo_objects();
