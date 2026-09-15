-- The push channel messaging.js asks for. Realtime applies each subscriber's
-- SELECT policies, so members only hear about their own conversations,
-- messages and connections.
alter publication supabase_realtime
  add table public.messages, public.conversations, public.connections;
