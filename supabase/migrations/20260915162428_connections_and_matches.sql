-- Connections and matches.
--
-- A connection is the "connect" action in App.jsx, one direction at a time.
-- A match is two connections that point at each other.

-- The canonical key for an unordered pair. Conversations use the same key,
-- which is what makes start_conversation idempotent.
create function private.pair_key(a uuid, b uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select least(a, b)::text || greatest(a, b)::text;
$$;

revoke execute on function private.pair_key(uuid, uuid) from public;
grant execute on function private.pair_key(uuid, uuid) to authenticated;

create table public.connections (
  from_profile uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_profile   uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (from_profile, to_profile),
  constraint connections_not_self check (from_profile <> to_profile)
);

create index connections_to_profile_idx on public.connections (to_profile);

alter table public.connections enable row level security;

revoke all on public.connections from anon, authenticated;
grant select, delete on public.connections to authenticated;
grant insert (from_profile, to_profile) on public.connections to authenticated;

-- Both directions of your own connections, unless the pair is blocked.
create policy "connections: see your own, unless blocked"
  on public.connections for select to authenticated
  using (
    (from_profile = (select auth.uid()) or to_profile = (select auth.uid()))
    and not private.is_blocked(from_profile, to_profile)
  );

-- Only as yourself, and only to a profile you are allowed to see, which the
-- profiles policy already limits to visible, onboarded and unblocked.
create policy "connections: connect as yourself to someone you can see"
  on public.connections for insert to authenticated
  with check (
    from_profile = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = to_profile)
  );

create policy "connections: withdraw your own"
  on public.connections for delete to authenticated
  using (from_profile = (select auth.uid()));

create view public.matches
with (security_invoker = true)
as
select
  private.pair_key(a.from_profile, a.to_profile) as pair_key,
  a.from_profile                                 as profile_a,
  a.to_profile                                   as profile_b,
  greatest(a.created_at, b.created_at)           as matched_at
from public.connections a
join public.connections b
  on b.from_profile = a.to_profile
 and b.to_profile = a.from_profile
where a.from_profile < a.to_profile;

revoke all on public.matches from anon, authenticated;
grant select on public.matches to authenticated;
