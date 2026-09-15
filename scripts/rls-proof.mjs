/**
 * RLS proof. Signs real members in over the real API with the publishable key,
 * tries the things row level security must refuse, and prints what came back.
 *
 *   node --env-file=.env scripts/rls-proof.mjs path/to/accounts.json
 *
 * accounts.json names three existing accounts, { owner, partner, outsider },
 * each { email, password }; keep it out of the repo. The script onboards owner
 * and partner if they are not already, makes them a mutual match with a
 * conversation and a photo, and then, as anon, as the outsider and as the
 * partner, tries to:
 *
 *   1. read a conversation they are not in
 *   2. send a message carrying someone else's sender_id
 *   3. write to someone else's photo folder
 *
 * A refusal is an error from the API or an operation that touched nothing.
 * Exits 1 if any attempt was allowed.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key || !process.argv[2]) {
  console.error("usage: node --env-file=.env scripts/rls-proof.mjs path/to/accounts.json");
  process.exit(2);
}
const accounts = JSON.parse(readFileSync(process.argv[2], "utf8"));
const png = readFileSync(new URL("../public/icon-192.png", import.meta.url));
const BUCKET = "profile-photos";

const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function signIn(label, { email, password }) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${label} could not sign in: ${error.message}`);
  return { label, c, id: data.user.id };
}

function must(result, what) {
  if (result.error && result.error.code !== "23505") throw new Error(`setup, ${what}: ${result.error.message}`);
  return result.data;
}

const results = [];
function record(attempt, who, refused, detail) {
  results.push({ attempt, who, refused, detail });
}
const said = (error) => `${error.statusCode ?? error.status ?? ""} ${error.code ?? ""} ${error.message}`.replace(/\s+/g, " ").trim();

// ---------- setup, done by the members themselves ----------

const anon = { label: "anon", c: client(), id: null };
const owner = await signIn("owner", accounts.owner);
const partner = await signIn("partner", accounts.partner);
const outsider = await signIn("outsider", accounts.outsider);

for (const [m, name, birthdate] of [[owner, "Proof Owner", "1961-05-31"], [partner, "Proof Partner", "1971-01-25"]]) {
  must(await m.c.from("profiles")
    .update({ display_name: name, birthdate, onboarded_at: new Date().toISOString() })
    .eq("id", m.id).is("onboarded_at", null), `onboarding the ${m.label}`);
}
must(await owner.c.from("connections").insert({ to_profile: partner.id }), "owner connects");
must(await partner.c.from("connections").insert({ to_profile: owner.id }), "partner connects");
const conversation = must(await owner.c.rpc("start_conversation", { other: partner.id }), "start_conversation");
must(await owner.c.from("messages")
  .insert({ conversation_id: conversation.id, sender_id: owner.id, text: "Setup: a message from the owner." }), "owner sends");

const photoPath = `${owner.id}/${crypto.randomUUID()}.png`;
must(await owner.c.storage.from(BUCKET).upload(photoPath, png, { contentType: "image/png" }), "owner uploads a photo");
const folderBefore = must(await owner.c.storage.from(BUCKET).list(owner.id), "owner lists their folder")
  .map((f) => f.name).sort();

console.log(`API ${url}, publishable key, members signed in with their own passwords`);
console.log(`owner ${owner.id}   partner ${partner.id}   outsider ${outsider.id}`);
console.log(`conversation ${conversation.id} between owner and partner; photo ${photoPath}\n`);

// ---------- 1. read a conversation you are not in ----------

for (const who of [anon, outsider]) {
  for (const [table, column] of [["conversations", "id"], ["conversation_participants", "conversation_id"], ["messages", "conversation_id"]]) {
    const r = await who.c.from(table).select("*").eq(column, conversation.id);
    record(`1. read ${table} of the owner's conversation`, who.label,
      r.error ? true : r.data.length === 0,
      r.error ? said(r.error) : `${r.data.length} rows returned`);
  }
}
{
  const r = await outsider.c.rpc("start_conversation", { other: owner.id });
  record("1. open a conversation with the owner (no mutual match)", "outsider",
    Boolean(r.error), r.error ? said(r.error) : `opened ${r.data.id}`);
}

// ---------- 2. forge sender_id ----------

const marker = `Forged as the owner ${Date.now()}`;
for (const who of [partner, outsider, anon]) {
  const r = await who.c.from("messages")
    .insert({ conversation_id: conversation.id, sender_id: owner.id, text: `${marker} by ${who.label}` });
  record("2. send a message with the owner's sender_id", who.label,
    Boolean(r.error), r.error ? said(r.error) : "inserted");
}
{
  const r = await owner.c.from("messages").select("id").eq("conversation_id", conversation.id).like("text", `${marker}%`);
  record("2. check, as the owner: forged messages in the thread", "owner",
    !r.error && r.data.length === 0, r.error ? said(r.error) : `${r.data.length} found`);
}

// ---------- 3. write to someone else's photo folder ----------

for (const who of [anon, outsider, partner]) {
  const fresh = await who.c.storage.from(BUCKET)
    .upload(`${owner.id}/${crypto.randomUUID()}.png`, png, { contentType: "image/png" });
  record("3. upload a new file into the owner's folder", who.label,
    Boolean(fresh.error), fresh.error ? said(fresh.error) : `uploaded ${fresh.data.path}`);

  const over = await who.c.storage.from(BUCKET)
    .upload(photoPath, png, { contentType: "image/png", upsert: true });
  record("3. overwrite the owner's photo", who.label,
    Boolean(over.error), over.error ? said(over.error) : `overwrote ${over.data.path}`);

  const del = await who.c.storage.from(BUCKET).remove([photoPath]);
  record("3. delete the owner's photo", who.label,
    del.error ? true : del.data.length === 0,
    del.error ? said(del.error) : `${del.data.length} objects deleted`);
}
{
  const r = await owner.c.storage.from(BUCKET).list(owner.id);
  const after = (r.data ?? []).map((f) => f.name).sort();
  const same = !r.error && JSON.stringify(after) === JSON.stringify(folderBefore);
  record("3. check, as the owner: folder unchanged", "owner", same,
    r.error ? said(r.error) : `${after.length} files, ${same ? "identical to before" : "CHANGED"}`);
}

// ---------- report, then tidy the photo away ----------

const width = Math.max(...results.map((r) => r.attempt.length));
for (const r of results) {
  console.log(`${r.refused ? "refused" : "ALLOWED"}  ${r.attempt.padEnd(width)}  as ${r.who.padEnd(8)}  ${r.detail}`);
}
await owner.c.storage.from(BUCKET).remove([photoPath]);

const allowed = results.filter((r) => !r.refused).length;
console.log(`\n${results.length} attempts, ${results.length - allowed} refused, ${allowed} allowed`);
process.exit(allowed ? 1 : 0);
