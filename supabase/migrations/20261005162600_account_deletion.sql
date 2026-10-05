-- Account deletion: the two things cascading cannot do.
--
-- supabase/functions/delete-account empties the person's Storage folder and
-- then deletes the auth user. Every app table that references a person already
-- cascades from auth.users — profiles, and from profiles: blocks, connections,
-- conversation_participants, messages, profile_photos and reports. Audited
-- against pg_constraint; the gaps were these.
--
-- 1. conversations has no foreign key to a person at all. It is keyed by
--    pair_key, so deleting a member removed their participant row and their
--    messages but left the conversation behind for ever. A conversation is a
--    pair: losing either member ends it.
--
-- 2. reports about the deleted person cascaded away with them, which let anyone
--    erase a moderation record by deleting their account and signing up again.
--    The report now outlives the account, stripped of who it was about.

-- ---------- 1. a conversation does not outlive its pair ----------

-- Security definer because the cascade that triggers this runs as whoever
-- deleted the account, who has no delete grant on conversations — nobody does.
create function private.conversations_drop_when_unpaired()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.conversations c
   where c.id = old.conversation_id
     and (
       select count(*) from public.conversation_participants p
        where p.conversation_id = c.id
     ) < 2;
  return null;
end;
$$;

revoke execute on function private.conversations_drop_when_unpaired() from public;

-- Deleting the conversation cascades the remaining participant rows, which
-- fires this again; the second pass finds no conversation row and stops. It
-- does not recurse.
create trigger conversation_participants_drop_unpaired_conversation
  after delete on public.conversation_participants
  for each row execute function private.conversations_drop_when_unpaired();

-- ---------- 2. a report outlives the account it is about ----------

-- reports_not_self stays correct: a CHECK only fails on false, and
-- reporter_id <> null is null, so a de-identified report still passes it.
alter table public.reports
  alter column reported_id drop not null,
  add column reported_deleted_at timestamptz;

alter table public.reports
  drop constraint reports_reported_id_fkey,
  add constraint reports_reported_id_fkey
    foreign key (reported_id) references public.profiles (id) on delete set null;

-- Stamped before the row goes, so the foreign key above can then null the id.
-- BEFORE DELETE on profiles fires ahead of the cascade that clears it.
create function private.reports_note_deleted_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reports
     set reported_deleted_at = now()
   where reported_id = old.id;
  return old;
end;
$$;

revoke execute on function private.reports_note_deleted_account() from public;

create trigger profiles_note_reports_before_delete
  before delete on public.profiles
  for each row execute function private.reports_note_deleted_account();

-- reported_deleted_at is written by that trigger and never by a client. The
-- original grant was a bare `insert`, which covered every column; naming the
-- three a reporter actually sends also stops a client choosing its own id or
-- created_at. reporter_id keeps its auth.uid() default and its RLS check.
revoke insert on public.reports from authenticated;
grant insert (reported_id, reason, message_id) on public.reports to authenticated;
