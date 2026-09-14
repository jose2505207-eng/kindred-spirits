/**
 * Direct messages — the transport.
 *
 * There is no messaging backend (CLAUDE.md: no backend calls), so this is an
 * in-memory stand-in and the only file that knows where messages live. Every
 * screen goes through the functions exported here, and they are async on
 * purpose: swap this file for a network implementation with the same exports
 * and nothing else changes. Nothing survives a reload.
 *
 * What a real backend needs to expose, in this shape:
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
 * Plus, before real people use it: auth, block and report, rate limits, and
 * read receipts if the client wants them.
 */

/** The signed-in person. There are no accounts in the prototype. */
export const ME = "me";

/** How a seeded profile is addressed. */
export const personId = (profileId) => `profile:${profileId}`;

// Demo only: a seeded profile answers your first message once, so a thread
// does not sit silent in a client review. Goes away with this file.
const AUTO_REPLY = true;
const REPLY_DELAY_MS = 1400;
const REPLIES = [
  "Hello! I was hoping someone would say it first.",
  "Hi — the cards seemed very sure about us. Curious whether they're right.",
  "Hello to you too. What brought you to the reading?",
  "Hi! Tell me something your card wouldn't know about you.",
  "Hello. I'll admit I looked at your spread twice.",
];

const conversations = new Map();   // id -> Conversation
const messages = new Map();        // conversation id -> Message[]
const listeners = new Set();
let seq = 0;

const nextId = (prefix) => `${prefix}${++seq}`;
const now = () => new Date().toISOString();
const activity = (c) => c.lastMessage?.sentAt ?? c.createdAt;
// Callers get copies, as they would from a network, so nobody edits the store.
const copy = (x) => structuredClone(x);
const emit = () => listeners.forEach((fn) => fn());

export async function startConversation(meId, themId) {
  for (const c of conversations.values()) {
    if (c.participantIds.includes(meId) && c.participantIds.includes(themId)) return copy(c);
  }
  const c = { id: nextId("c"), participantIds: [meId, themId], createdAt: now(), lastMessage: null };
  conversations.set(c.id, c);
  messages.set(c.id, []);
  emit();
  return copy(c);
}

export async function listConversations(memberId) {
  return [...conversations.values()]
    .filter((c) => c.participantIds.includes(memberId))
    .sort((a, b) => activity(b).localeCompare(activity(a)))
    .map(copy);
}

export async function listMessages(conversationId) {
  return copy(messages.get(conversationId) ?? []);
}

export async function sendMessage(conversationId, senderId, text) {
  const c = conversations.get(conversationId);
  if (!c) throw new Error(`No conversation ${conversationId}`);
  const body = String(text).trim();
  if (!body) throw new Error("A message needs some text.");

  const m = { id: nextId("m"), conversationId, senderId, text: body, sentAt: now() };
  messages.get(conversationId).push(m);
  c.lastMessage = m;
  emit();
  if (AUTO_REPLY) replyOnce(c, senderId);
  return copy(m);
}

/** Calls `listener` after any change. Returns the unsubscribe function. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function replyOnce(c, senderId) {
  const other = c.participantIds.find((id) => id !== senderId);
  const thread = messages.get(c.id);
  if (other === ME || thread.some((m) => m.senderId === other)) return;
  if (thread.filter((m) => m.senderId === senderId).length !== 1) return;
  const pick = Number(other.split(":")[1]) % REPLIES.length || 0;
  setTimeout(() => sendMessage(c.id, other, REPLIES[pick]), REPLY_DELAY_MS);
}
