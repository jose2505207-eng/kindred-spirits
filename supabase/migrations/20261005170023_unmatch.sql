-- Unmatch: ending a connection without blocking.
--
-- A block is a heavy, mutual, permanent thing — docs/DESIGN.md: both people
-- drop out of each other's app entirely. Walking away from a match should not
-- require it, and should not tell the other person they have been blocked.
--
-- What unmatching does: the conversation disappears for both, and neither can
-- write into it. What it deliberately does not do: destroy anything. The rows
-- stay and my_conversation_ids() simply stops returning the thread, so one
-- person's unmatch cannot delete the other person's copy of the history, and a
-- later rematch reopens the thread they already had.
--
-- The whole rule is one change to my_conversation_ids(), because that function
-- already gates SELECT on conversations, conversation_participants and
-- messages, and the INSERT policy on messages. Hiding the thread and refusing
-- the message are the same sentence.

create or replace function private.my_conversation_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select me.conversation_id
  from public.conversation_participants me
  where me.profile_id = (select auth.uid())
    -- Unchanged: nobody in it has blocked you, or been blocked by you.
    and not exists (
      select 1
      from public.conversation_participants them
      where them.conversation_id = me.conversation_id
        and them.profile_id <> me.profile_id
        and private.is_blocked(me.profile_id, them.profile_id)
    )
    -- New: the pair is still a mutual match. Either of you deleting your own
    -- connection row ends it, which is what unmatching is.
    and exists (
      select 1
      from public.conversation_participants them
      join public.connections mine
        on mine.from_profile = me.profile_id
       and mine.to_profile   = them.profile_id
      join public.connections theirs
        on theirs.from_profile = them.profile_id
       and theirs.to_profile   = me.profile_id
      where them.conversation_id = me.conversation_id
        and them.profile_id <> me.profile_id
    );
$$;

-- Unmatching removes both connection rows, not just the caller's.
--
-- Deleting only your own row would already end the match and hide the thread,
-- but it would leave the other person still connected to you — so if you ever
-- reconnected, you would be a match again without them choosing it a second
-- time. The existing "connections: withdraw your own" policy cannot delete
-- their row, and widening it would let anyone delete anybody's connection, so
-- this is a function whose reach is limited to the pair the caller is in.
create function private.unmatch(other uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Sign in to unmatch.' using errcode = '42501';
  end if;

  if other is null or other = me then
    raise exception 'A match needs someone else in it.' using errcode = '22023';
  end if;

  delete from public.connections
   where (from_profile = me    and to_profile = other)
      or (from_profile = other and to_profile = me);
end;
$$;

revoke execute on function private.unmatch(uuid) from public;
grant execute on function private.unmatch(uuid) to authenticated;

create function public.unmatch(other uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.unmatch(other);
$$;

revoke execute on function public.unmatch(uuid) from public, anon;
grant execute on function public.unmatch(uuid) to authenticated;
