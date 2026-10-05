-- Report moderation: who moderates, what a report's life looks like, and what
-- being suspended means.
--
-- Until now a report was write-once for the reporter and read with the service
-- role. docs/DESIGN.md said "a report goes to whoever moderates" without
-- saying who that is or what they can do. This names moderators in a table
-- nobody can add themselves to, gives a report a status and a reviewer, and
-- gives a moderator exactly two powers: read every report, and suspend a
-- profile.
--
-- Suspension is deliberately not a column a client may write. Granting
-- suspended_at to `authenticated` would let a suspended member clear their own
-- suspension through the existing "edit only your own row" policy, because
-- Postgres ORs the USING clauses of several UPDATE policies. It goes through
-- public.set_profile_suspended() instead — the same private-body with an
-- invoker wrapper that start_conversation uses.

-- ---------- who moderates ----------

-- There is no INSERT, UPDATE or DELETE grant to anyone, so there is no client
-- path to this table at all: a moderator is added with the service role or from
-- the dashboard. That is what "no self-insert" means here.
create table public.moderators (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.moderators enable row level security;

revoke all on public.moderators from anon, authenticated;
grant select on public.moderators to authenticated;

-- Enough to answer "am I a moderator?", and nothing about anybody else.
create policy "moderators: see only your own row"
  on public.moderators for select to authenticated
  using (profile_id = (select auth.uid()));

-- Security definer: policies on reports and profiles call this for the current
-- member, who cannot read the moderators table beyond their own row.
create function private.is_moderator(who uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.moderators
     where profile_id = coalesce(who, (select auth.uid()))
  );
$$;

revoke execute on function private.is_moderator(uuid) from public;
grant execute on function private.is_moderator(uuid) to authenticated;

-- ---------- a report's life ----------

create type public.report_status as enum ('open', 'actioned', 'dismissed');

alter table public.reports
  add column status      public.report_status not null default 'open',
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz,
  add column action_note text;

alter table public.reports
  add constraint reports_action_note_length check (char_length(action_note) <= 2000),
  -- A report that is no longer open says when it was looked at. reviewed_by may
  -- be null: the moderator who closed it is allowed to have left since.
  add constraint reports_reviewed_when_closed check (
    status = 'open' or reviewed_at is not null
  );

create index reports_open_idx on public.reports (created_at desc) where status = 'open';
create index reports_reviewed_by_idx on public.reports (reviewed_by);

-- Moderators read every report, the reporter still reads their own. This
-- replaces the policy from the blocks and reports migration rather than sitting
-- beside it: two permissive policies for the same role and action make the
-- planner run both, which the performance advisor flags.
drop policy "reports: see the reports you filed" on public.reports;

create policy "reports: the ones you filed, or any if you moderate"
  on public.reports for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or private.is_moderator()
  );

-- Reviewing is the only write, and only over these four columns. reports had no
-- UPDATE policy before, so a non-moderator's update fails RLS outright.
grant update (status, reviewed_by, reviewed_at, action_note)
  on public.reports to authenticated;

create policy "reports: moderators review"
  on public.reports for update to authenticated
  using (private.is_moderator())
  with check (private.is_moderator());

-- ---------- suspension ----------

alter table public.profiles
  add column suspended_at     timestamptz,
  add column suspended_reason text;

alter table public.profiles
  add constraint profiles_suspended_reason_length
    check (char_length(suspended_reason) <= 500),
  add constraint profiles_suspended_reason_needs_suspension check (
    suspended_at is not null or suspended_reason is null
  );

create index profiles_suspended_idx on public.profiles (suspended_at)
  where suspended_at is not null;

create function private.is_suspended(who uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = who and suspended_at is not null
  );
$$;

revoke execute on function private.is_suspended(uuid) from public;
grant execute on function private.is_suspended(uuid) to authenticated;

-- A suspended member drops out of everyone else's app but still reads their own
-- row, so the app can tell them why nothing works. A moderator reads every
-- profile, because otherwise suspending someone would hide them from the very
-- screen that just suspended them — folded into this one policy rather than
-- added beside it, for the same reason as the reports policy above.
drop policy "profiles: read your own row, or visible unblocked ones" on public.profiles;

create policy "profiles: your own row, a visible unblocked one, or any if you moderate"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or private.is_moderator()
    or (
      is_visible
      and onboarded_at is not null
      and suspended_at is null
      and not private.is_blocked((select auth.uid()), id)
    )
  );

-- The feed's view drops suspended people too. security_invoker means the
-- policy above already would, but the view is the contract the feed reads, so
-- it says so itself.
create or replace view public.public_profiles
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
  and suspended_at is null
  and id <> (select auth.uid());

-- A suspended member cannot send a message.
drop policy "messages: members send as themselves" on public.messages;

create policy "messages: members send as themselves, unless suspended"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and not private.is_suspended((select auth.uid()))
    and conversation_id in (select private.my_conversation_ids())
  );

-- ...and cannot open one either. Otherwise a suspended member could still
-- create threads they are then refused permission to write into.
create or replace function private.start_conversation(other uuid)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  me   uuid := (select auth.uid());
  key  text;
  conv public.conversations;
begin
  if me is null then
    raise exception 'Sign in to start a conversation.' using errcode = '42501';
  end if;

  if private.is_suspended(me) then
    raise exception 'Your account is suspended.' using errcode = '42501';
  end if;

  if other is null or other = me then
    raise exception 'A conversation needs someone else in it.' using errcode = '22023';
  end if;

  -- One refusal for "not mutual" and "blocked", so nobody can use this to
  -- learn that they have been blocked.
  if private.is_blocked(me, other)
     or not exists (select 1 from public.connections where from_profile = me and to_profile = other)
     or not exists (select 1 from public.connections where from_profile = other and to_profile = me)
  then
    raise exception 'You can only start a conversation with a mutual match.' using errcode = '42501';
  end if;

  key := private.pair_key(me, other);

  insert into public.conversations (pair_key) values (key)
  on conflict (pair_key) do nothing
  returning * into conv;

  if conv.id is null then
    select * into conv from public.conversations where pair_key = key;
  else
    insert into public.conversation_participants (conversation_id, profile_id)
    values (conv.id, me), (conv.id, other);
  end if;

  return conv;
end;
$$;

-- ---------- suspending, as a moderator ----------

create function private.set_profile_suspended(target uuid, reason text, suspended boolean)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated public.profiles;
begin
  if not private.is_moderator() then
    raise exception 'Only a moderator can suspend a profile.' using errcode = '42501';
  end if;

  if target is null then
    raise exception 'Which profile?' using errcode = '22023';
  end if;

  if suspended and target = (select auth.uid()) then
    raise exception 'A moderator cannot suspend their own account.' using errcode = '22023';
  end if;

  update public.profiles
     set suspended_at     = case when suspended then now() else null end,
         suspended_reason = case when suspended then nullif(btrim(reason), '') else null end
   where id = target
  returning * into updated;

  if updated.id is null then
    raise exception 'No such profile.' using errcode = '22023';
  end if;

  return updated;
end;
$$;

revoke execute on function private.set_profile_suspended(uuid, text, boolean) from public;
grant execute on function private.set_profile_suspended(uuid, text, boolean) to authenticated;

create function public.set_profile_suspended(
  target uuid, reason text default null, suspended boolean default true
)
returns public.profiles
language sql
security invoker
set search_path = ''
as $$
  select * from private.set_profile_suspended(target, reason, suspended);
$$;

revoke execute on function public.set_profile_suspended(uuid, text, boolean) from public, anon;
grant execute on function public.set_profile_suspended(uuid, text, boolean) to authenticated;
