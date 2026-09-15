-- Blocks, reports, and who can see whom.
--
-- src/lib/messaging.js names block and report as prerequisites for real
-- people. A block works in both directions and is enforced here, in RLS: the
-- blocked pair drop out of each other's profiles, photos, connections and
-- conversations whatever the client does.

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_id_idx on public.blocks (blocked_id);

-- Security definer because a person must be hidden from someone who blocked
-- them, yet may not read that someone's blocks.
create function private.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

revoke execute on function private.is_blocked(uuid, uuid) from public;
grant execute on function private.is_blocked(uuid, uuid) to authenticated;

alter table public.blocks enable row level security;

revoke all on public.blocks from anon, authenticated;
grant select, insert, delete on public.blocks to authenticated;

create policy "blocks: see the blocks you made"
  on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "blocks: block as yourself"
  on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "blocks: lift your own blocks"
  on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- Reports are write-once for the reporter and never visible to the reported.
-- Moderation reads them with the service role.
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason      text not null,
  created_at  timestamptz not null default now(),
  constraint reports_not_self check (reporter_id <> reported_id),
  constraint reports_reason_length check (char_length(btrim(reason)) between 1 and 2000)
);

create index reports_reporter_id_idx on public.reports (reporter_id);
create index reports_reported_id_idx on public.reports (reported_id);

alter table public.reports enable row level security;

revoke all on public.reports from anon, authenticated;
grant select, insert on public.reports to authenticated;

create policy "reports: see the reports you filed"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

create policy "reports: file as yourself"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- Profiles: your own row always; anyone else's only once they have onboarded,
-- while they are visible, and while neither of you has blocked the other.
drop policy "profiles: read your own row" on public.profiles;

create policy "profiles: read your own row, or visible unblocked ones"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (
      is_visible
      and onboarded_at is not null
      and not private.is_blocked((select auth.uid()), id)
    )
  );

-- What the feed needs about other people, and nothing more.
--
-- security_invoker means the profiles policy above decides the rows. This view
-- is a contract, not a privacy boundary: ranking runs on the client, so it has
-- to hand every signed-in member each candidate's full birthdate, year
-- included. docs/DESIGN.md, "Who can see a birth year", records the
-- server-side alternative that would stop that.
create view public.public_profiles
with (security_invoker = true)
as
select
  id,
  display_name,
  birthdate,
  bio,
  bowtie_emoji,
  bowtie_image_path,
  bowtie_backdrop,
  bowtie_caption
from public.profiles
where is_visible
  and onboarded_at is not null
  and id <> (select auth.uid());

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to authenticated;
