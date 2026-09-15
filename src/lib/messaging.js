/**
 * Direct messages — the transport.
 *
 * The only file that knows where messages live. Every screen goes through the
 * functions exported here, and they are async on purpose; src/lib/useMessaging.js
 * binds them to React.
 *
 * Signed in, messages live in Supabase: start_conversation() opens a thread,
 * the conversations, conversation_participants and messages tables hold it,
 * and a Realtime channel pushes changes. The database enforces the rules — the
 * sender is the session, a blocked pair can neither read nor send, twenty
 * messages a minute — so nothing here is trusted to. With VITE_DEMO_MODE=true
 * there are no accounts: messages live in memory, seeded profiles reply once,
 * and nothing survives a reload.
 *
 * The contract, as a backend exposes it:
 *
 *   POST /conversations                 { participantId }      -> Conversation
 *        idempotent per pair: returns the existing conversation if there is one
 *   GET  /conversations                                        -> Conversation[]
 *        the signed-in member's, most recent activity first, with lastMessage
 *   GET  /conversations/:id/messages     ?before=<cursor>       -> Message[]
 *   POST /conversations/:id/messages     { text }               -> Message
 *        the sender comes from the session, never from the body
 *   a push channel (WebSocket or SSE) for conversation.created and
 *   message.created, which is what subscribe() stands in for
 *
 *   Conversation { id, participantIds: [string, string], createdAt, lastMessage: Message | null }
 *   Message      { id, conversationId, senderId, text, sentAt }      times are ISO 8601
 *
 * Block, report and the rate limit are built; read receipts are not.
 */

import { DEMO, currentMember, onMemberChange, supabase } from "./supabase.js";

/** The signed-in person. Kept current as members sign in and out. */
export let ME = DEMO ? "me" : currentMember().id;

/** How a profile is addressed. Signed in, a profile's id already is its address. */
export const personId = DEMO
  ? (profileId) => `profile:${profileId}`
  : (profileId) => profileId;

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
const activity = (c) => Date.parse(c.lastMessage?.sentAt ?? c.createdAt);

export async function startConversation(meId, themId) {
  return DEMO ? memory.start(meId, themId) : remote.start(meId, themId);
}

export async function listConversations(memberId) {
  return DEMO ? memory.list(memberId) : remote.list(memberId);
}

export async function listMessages(conversationId) {
  return DEMO ? memory.messages(conversationId) : remote.messages(conversationId);
}

export async function sendMessage(conversationId, senderId, text) {
  const body = String(text).trim();
  if (!body) throw new Error("A message needs some text.");
  return DEMO ? memory.send(conversationId, senderId, body) : remote.send(conversationId, senderId, body);
}

/** Calls `listener` after any change. Returns the unsubscribe function. */
export function subscribe(listener) {
  listeners.add(listener);
  remote.connect();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) remote.disconnect();
  };
}

// ---------- Supabase ----------

const MESSAGE_COLUMNS = "id, conversation_id, sender_id, text, sent_at";
const PAGE = 200;

const fail = (error) => { if (error) throw new Error(error.message); };
const toMessage = (row) => ({
  id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, text: row.text, sentAt: row.sent_at,
});

const remote = {
  channel: null,

  async start(meId, themId) {
    const { data, error } = await supabase.rpc("start_conversation", { other: themId });
    fail(error);
    emit();
    const [found] = await remote.list(meId, data.id);
    return found ?? { id: data.id, participantIds: [meId, themId], createdAt: data.created_at, lastMessage: null };
  },

  async list(memberId, onlyId) {
    let query = supabase.from("conversations")
      .select(`id, created_at, conversation_participants(profile_id), messages(${MESSAGE_COLUMNS})`)
      .order("sent_at", { referencedTable: "messages", ascending: false })
      .limit(1, { referencedTable: "messages" });
    if (onlyId) query = query.eq("id", onlyId);
    const { data, error } = await query;
    fail(error);

    return data
      .filter((c) => c.conversation_participants.some((p) => p.profile_id === memberId))
      .map((c) => ({
        id: c.id,
        participantIds: [memberId, ...c.conversation_participants
          .map((p) => p.profile_id).filter((id) => id !== memberId)],
        createdAt: c.created_at,
        lastMessage: c.messages[0] ? toMessage(c.messages[0]) : null,
      }))
      .sort((a, b) => activity(b) - activity(a));
  },

  // The newest page, oldest first, read through the (conversation_id, sent_at desc) index.
  async messages(conversationId) {
    const { data, error } = await supabase.from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: false })
      .limit(PAGE);
    fail(error);
    return data.reverse().map(toMessage);
  },

  // sender_id is sent so a mismatch is refused loudly by RLS, not quietly replaced.
  async send(conversationId, senderId, text) {
    const { data, error } = await supabase.from("messages")
      .insert({ conversation_id: conversationId, sender_id: senderId, text })
      .select(MESSAGE_COLUMNS)
      .single();
    fail(error);
    emit();
    return toMessage(data);
  },

  connect() {
    if (DEMO || !supabase || remote.channel || !ME || !listeners.size) return;
    remote.channel = supabase.channel(`messages:${ME}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => emit())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => emit())
      .subscribe();
  },

  disconnect() {
    if (!remote.channel) return;
    supabase.removeChannel(remote.channel);
    remote.channel = null;
  },
};

if (!DEMO && supabase) {
  onMemberChange(({ id }) => {
    remote.disconnect();
    ME = id;
    remote.connect();
  });
}

// ---------- In memory, for demo mode ----------

// A seeded profile answers your first message once, so a thread does not sit
// silent in a client review.
const AUTO_REPLY = true;
const REPLY_DELAY_MS = 1400;
const REPLIES = [
  "Hello! I was hoping someone would say it first.",
  "Hi — the cards seemed very sure about us. Curious whether they're right.",
  "Hello to you too. What brought you to the reading?",
  "Hi! Tell me something your card wouldn't know about you.",
  "Hello. I'll admit I looked at your spread twice.",
];

const memory = {
  conversations: new Map(),   // id -> Conversation
  threads: new Map(),         // conversation id -> Message[]
  seq: 0,

  nextId: (prefix) => `${prefix}${++memory.seq}`,
  now: () => new Date().toISOString(),
  // Callers get copies, as they would from a network, so nobody edits the store.
  copy: (x) => structuredClone(x),

  async start(meId, themId) {
    for (const c of memory.conversations.values()) {
      if (c.participantIds.includes(meId) && c.participantIds.includes(themId)) return memory.copy(c);
    }
    const c = { id: memory.nextId("c"), participantIds: [meId, themId], createdAt: memory.now(), lastMessage: null };
    memory.conversations.set(c.id, c);
    memory.threads.set(c.id, []);
    emit();
    return memory.copy(c);
  },

  async list(memberId) {
    return [...memory.conversations.values()]
      .filter((c) => c.participantIds.includes(memberId))
      .sort((a, b) => activity(b) - activity(a))
      .map(memory.copy);
  },

  async messages(conversationId) {
    return memory.copy(memory.threads.get(conversationId) ?? []);
  },

  async send(conversationId, senderId, text) {
    const c = memory.conversations.get(conversationId);
    if (!c) throw new Error(`No conversation ${conversationId}`);
    const m = { id: memory.nextId("m"), conversationId, senderId, text, sentAt: memory.now() };
    memory.threads.get(conversationId).push(m);
    c.lastMessage = m;
    emit();
    if (AUTO_REPLY) memory.replyOnce(c, senderId);
    return memory.copy(m);
  },

  replyOnce(c, senderId) {
    const other = c.participantIds.find((id) => id !== senderId);
    const thread = memory.threads.get(c.id);
    if (other === ME || thread.some((m) => m.senderId === other)) return;
    if (thread.filter((m) => m.senderId === senderId).length !== 1) return;
    const pick = Number(other.split(":")[1]) % REPLIES.length || 0;
    setTimeout(() => memory.send(c.id, other, REPLIES[pick]), REPLY_DELAY_MS);
  },
};
