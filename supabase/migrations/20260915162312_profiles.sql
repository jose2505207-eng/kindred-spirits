-- Profiles: one row per account, created by a trigger on sign-up.
--
-- birthdate is nullable until onboarding. handle_new_user() has to insert a
-- row the moment an account exists, before the person has typed a birthdate,
-- and inventing a placeholder date would silently produce a reading for a
-- birthday nobody has. The profiles_onboarded_complete constraint keeps the
-- real invariant instead: an onboarded profile always has a name and a
-- birthdate, and only onboarded profiles are ever shown to anyone else.
--
-- Bowtie columns mirror src/lib/bowtie.js. Defaults are DEFAULT_BOWTIE; the
-- backdrop is one of the eight BACKDROPS hexes, stored lowercase; the caption
-- limit is CAPTION_MAX; the image is a Storage path in the person's own
-- profile-photos folder rather than a data URL.

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text not null default '',
  birthdate         date,
  business          boolean not null default false,
  bio               text,
  is_visible        boolean not null default true,
  onboarded_at      timestamptz,
  bowtie_emoji      text not null default '🙂',
  bowtie_image_path text,
  bowtie_backdrop   text not null default '#c6a03c',
  bowtie_caption    text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint profiles_onboarded_complete check (
    onboarded_at is null
    or (birthdate is not null and char_length(btrim(display_name)) > 0)
  ),
  constraint profiles_display_name_length check (char_length(display_name) <= 80),
  constraint profiles_birthdate_floor check (birthdate >= date '1900-01-01'),
  constraint profiles_bio_length check (char_length(bio) <= 1000),
  constraint profiles_bowtie_emoji_length check (char_length(bowtie_emoji) between 1 and 16),
  constraint profiles_bowtie_backdrop check (bowtie_backdrop in (
    '#c6a03c', '#8e1f2b', '#d98e8a', '#d5813b',
    '#3f8f6b', '#4f7896', '#6e4c8a', '#f3eee2'
  )),
  constraint profiles_bowtie_caption_length check (char_length(bowtie_caption) <= 60),
  constraint profiles_bowtie_image_own_folder check (
    bowtie_image_path is null or split_part(bowtie_image_path, '/', 1) = id::text
  )
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- A CHECK cannot compare against today's date, so the future bound is a trigger.
create function private.profiles_reject_future_birthdate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birthdate > current_date then
    raise exception 'A birthdate cannot be in the future.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function private.profiles_reject_future_birthdate() from public;

create trigger profiles_reject_future_birthdate
  before insert or update of birthdate on public.profiles
  for each row execute function private.profiles_reject_future_birthdate();

-- Every account gets a stub row, so the app never has to create one.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Access. Nothing for anon. Column grants keep id, timestamps and anything
-- else not listed out of the client's reach; there is no DELETE grant, so a
-- profile only goes away with its account. Because the stub row always
-- exists, onboarding is an UPDATE, not an upsert.
alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name, birthdate, business, bio, is_visible, onboarded_at,
  bowtie_emoji, bowtie_image_path, bowtie_backdrop, bowtie_caption)
  on public.profiles to authenticated;
grant update (display_name, birthdate, business, bio, is_visible, onboarded_at,
  bowtie_emoji, bowtie_image_path, bowtie_backdrop, bowtie_caption)
  on public.profiles to authenticated;

-- Widened to visible, unblocked profiles in the blocks migration, once blocks exist.
create policy "profiles: read your own row"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: create only your own row"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles: edit only your own row"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
