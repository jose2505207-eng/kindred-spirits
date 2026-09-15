-- Conversations and messages, satisfying the contract at the top of
-- src/lib/messaging.js:
--
--   POST /conversations { participantId }  -> start_conversation(other), idempotent per pair
--   GET  /conversations                    -> conversations the member is in, by last_message_at
--   GET  /conversations/:id/messages       -> messages, cursor on (conversation_id, sent_at desc)
--   POST /conversations/:id/messages       -> insert; the sender is the session, never the body
--   push channel                           -> Realtime on conversations and messages
--
-- Clients never write conversations or participants directly; only
-- start_conversation does.

create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  pair_key        text not null unique,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create index conversation_participants_profile_id_idx
  on public.conversation_participants (profile_id);

-- sent_at is this table's creation time. It is not in the client's INSERT
-- grant, so it is always the server's clock and the before cursor can trust it.
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  text            text not null,
  sent_at         timestamptz not null default now(),
  constraint messages_text_not_blank check (char_length(btrim(text)) > 0),
  constraint messages_text_length check (char_length(text) <= 4000)
);

create index messages_conversation_sent_at_idx on public.messages (conversation_id, sent_at desc);
create index messages_sender_sent_at_idx on public.messages (sender_id, sent_at desc);

-- A report can point at the message that prompted it.
alter table public.reports
  add column message_id uuid references public.messages (id) on delete set null;
create index reports_message_id_idx on public.reports (message_id);

-- The conversations the signed-in member may open: ones they are in, where
-- nobody else in it has blocked them or been blocked by them. Security
-- definer so the participants lookup does not recurse through its own policy.
create function private.my_conversation_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select me.conversation_id
  from public.conversation_participants me
  where me.profile_id = (select auth.uid())
    and not exists (
      select 1
      from public.conversation_participants them
      where them.conversation_id = me.conversation_id
        and them.profile_id <> me.profile_id
        and private.is_blocked(me.profile_id, them.profile_id)
    );
$$;

revoke execute on function private.my_conversation_ids() from public;
grant execute on function private.my_conversation_ids() to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

revoke all on public.conversations from anon, authenticated;
revoke all on public.conversation_participants from anon, authenticated;
revoke all on public.messages from anon, authenticated;

grant select on public.conversations to authenticated;
grant select on public.conversation_participants to authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, text) on public.messages to authenticated;

create policy "conversations: members only"
  on public.conversations for select to authenticated
  using (id in (select private.my_conversation_ids()));

create policy "conversation_participants: members only"
  on public.conversation_participants for select to authenticated
  using (conversation_id in (select private.my_conversation_ids()));

create policy "messages: members read"
  on public.messages for select to authenticated
  using (conversation_id in (select private.my_conversation_ids()));

-- The sender is checked, not merely defaulted: a forged sender_id is refused.
create policy "messages: members send as themselves"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and conversation_id in (select private.my_conversation_ids())
  );

-- Crude flood control: 20 messages a minute per sender, across all threads.
-- PT429 makes the Data API answer 429 Too Many Requests.
create function private.messages_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from (
      select 1 from public.messages
      where sender_id = new.sender_id
        and sent_at > now() - interval '1 minute'
      limit 20
    ) recent
  ) >= 20 then
    raise exception 'That is a lot of messages in one minute. Give it a moment, then send again.'
      using errcode = 'PT429';
  end if;
  return new;
end;
$$;

revoke execute on function private.messages_rate_limit() from public;

create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function private.messages_rate_limit();

-- listConversations sorts by most recent activity.
create function private.messages_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
     set last_message_at = new.sent_at
   where id = new.conversation_id
     and (last_message_at is null or last_message_at < new.sent_at);
  return null;
end;
$$;

revoke execute on function private.messages_touch_conversation() from public;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function private.messages_touch_conversation();

-- start_conversation. The privileged body lives in `private`, outside the
-- exposed API; public.start_conversation is a security invoker wrapper, which
-- is the remediation Supabase's advisor gives for security definer functions
-- (lints 0028/0029). Every signed-in member is meant to be able to call it:
-- it does its own checks.
create function private.start_conversation(other uuid)
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

revoke execute on function private.start_conversation(uuid) from public;
grant execute on function private.start_conversation(uuid) to authenticated;

create function public.start_conversation(other uuid)
returns public.conversations
language sql
security invoker
set search_path = ''
as $$
  select * from private.start_conversation(other);
$$;

revoke execute on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;
