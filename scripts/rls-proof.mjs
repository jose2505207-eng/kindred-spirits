/**
 * RLS proof. Signs real members in over the real API with the publishable key,
 * tries the things row level security must refuse, and prints what came back.
 *
 *   node --env-file=.env scripts/rls-proof.mjs path/to/accounts.json
 *
 * accounts.json names existing accounts, each { email, password }; keep it out
 * of the repo:
 *
 *   { "owner": {...}, "partner": {...}, "outsider": {...},
 *     "moderator": {...} }        <- optional, see below
 *
 * The script onboards owner and partner if they are not already, makes them a
 * mutual match with a conversation and a photo, and then, as anon, as the
 * outsider and as the partner, tries to:
 *
 *   1. read a conversation they are not in
 *   2. send a message carrying someone else's sender_id
 *   3. write to someone else's photo folder
 *   4. onboard with a birthdate under 18
 *   5. read or review reports without being a moderator, and suspend somebody
 *   6. suspend, and then message, as a suspended member   (needs "moderator")
 *   7. message into a conversation after unmatching
 *   8. delete an account that is not theirs
 *
 * Section 6 only runs if accounts.json has a "moderator" whose profile is in
 * the moderators table — which is a service-role or dashboard action on
 * purpose, since nothing in the app can add one. Without it the section is
 * skipped and says so, and the SQL probe recorded in docs/TESTING.md covers
 * the same ground.
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
  return { label, c, id: data.user.id, token: data.session.access_token };
}

function must(result, what) {
  if (result.error && result.error.code !== "23505") throw new Error(`setup, ${what}: ${result.error.message}`);
  return result.data;
}

const results = [];
function record(attempt, who, refused, detail) {
  results.push({ attempt, who, refused, detail });
}
const skipped = [];
const said = (error) => `${error.statusCode ?? error.status ?? ""} ${error.code ?? ""} ${error.message}`.replace(/\s+/g, " ").trim();

/** A birthdate exactly `years` before today, as YYYY-MM-DD. */
function yearsAgo(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

// ---------- setup, done by the members themselves ----------

const anon = { label: "anon", c: client(), id: null };
const owner = await signIn("owner", accounts.owner);
const partner = await signIn("partner", accounts.partner);
const outsider = await signIn("outsider", accounts.outsider);
const moderator = accounts.moderator ? await signIn("moderator", accounts.moderator) : null;

for (const [m, name, birthdate] of [[owner, "Proof Owner", "1961-05-31"], [partner, "Proof Partner", "1971-01-25"]]) {
  must(await m.c.from("profiles")
    .update({ display_name: name, birthdate, onboarded_at: new Date().toISOString() })
    .eq("id", m.id).is("onboarded_at", null), `onboarding the ${m.label}`);
}

// Interested in everyone, both ways, so the mutual-interest filter in
// public_profiles is never what hides a candidate during this run.
for (const m of [owner, partner, outsider]) {
  must(await m.c.from("profiles").update({ interested_in: [] }).eq("id", m.id),
    `clearing the ${m.label}'s interest filter`);
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
if (moderator) console.log(`moderator ${moderator.id}`);
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

// ---------- 4. onboard as a child ----------

for (const [years, label] of [[17, "17 years old"], [0, "born today"]]) {
  const r = await outsider.c.from("profiles")
    .update({ birthdate: yearsAgo(years) }).eq("id", outsider.id);
  record(`4. set a birthdate ${label}`, "outsider",
    Boolean(r.error), r.error ? said(r.error) : "accepted");
}
{
  // The boundary: exactly 18 today is allowed, and is not a hole.
  const r = await outsider.c.from("profiles")
    .update({ birthdate: yearsAgo(18) }).eq("id", outsider.id);
  record("4. check: exactly 18 today is still allowed", "outsider",
    !r.error, r.error ? `WRONGLY REFUSED ${said(r.error)}` : "accepted, as it should be");
}

// ---------- 5. moderate without being a moderator ----------

must(await owner.c.from("reports")
  .insert({ reported_id: partner.id, reason: "Proof: a report for the moderation checks." }),
  "owner files a report");

for (const who of [anon, outsider, partner]) {
  const r = await who.c.from("reports").select("id, reason, status");
  record("5. read every report", who.label,
    r.error ? true : r.data.length === 0,
    r.error ? said(r.error) : `${r.data.length} rows returned`);
}
{
  const mine = await owner.c.from("reports").select("id").limit(1);
  const reportId = mine.data?.[0]?.id;
  for (const who of [outsider, partner]) {
    const r = await who.c.from("reports")
      .update({ status: "dismissed", reviewed_at: new Date().toISOString() })
      .eq("id", reportId).select("id");
    record("5. review a report", who.label,
      r.error ? true : (r.data?.length ?? 0) === 0,
      r.error ? said(r.error) : `${r.data.length} rows updated`);
  }
}
for (const who of [outsider, partner]) {
  const r = await who.c.rpc("set_profile_suspended", { target: owner.id, reason: "because", suspended: true });
  record("5. suspend another member", who.label,
    Boolean(r.error), r.error ? said(r.error) : "suspended them");
}
{
  const r = await outsider.c.from("moderators").select("profile_id");
  record("5. read who the moderators are", "outsider",
    r.error ? true : r.data.length === 0,
    r.error ? said(r.error) : `${r.data.length} rows returned`);
}
{
  const r = await outsider.c.from("moderators").insert({ profile_id: outsider.id });
  record("5. make yourself a moderator", "outsider",
    Boolean(r.error), r.error ? said(r.error) : "inserted");
}

// ---------- 6. act while suspended ----------

if (!moderator) {
  skipped.push("6. suspended members: no \"moderator\" in accounts.json, so nothing could be suspended");
} else {
  const on = await moderator.c.rpc("set_profile_suspended",
    { target: partner.id, reason: "Proof: suspended for the RLS proof.", suspended: true });
  if (on.error) {
    skipped.push(`6. suspended members: the moderator could not suspend (${said(on.error)}) — is their profile in the moderators table?`);
  } else {
    const send = await partner.c.from("messages")
      .insert({ conversation_id: conversation.id, sender_id: partner.id, text: "Proof: sent while suspended." });
    record("6. send a message while suspended", "partner",
      Boolean(send.error), send.error ? said(send.error) : "sent");

    const open = await partner.c.rpc("start_conversation", { other: owner.id });
    record("6. open a conversation while suspended", "partner",
      Boolean(open.error), open.error ? said(open.error) : `opened ${open.data.id}`);

    const seen = await outsider.c.from("public_profiles").select("id").eq("id", partner.id);
    record("6. a suspended member appears in the feed", "outsider",
      seen.error ? true : seen.data.length === 0,
      seen.error ? said(seen.error) : `${seen.data.length} rows returned`);

    const lift = await moderator.c.rpc("set_profile_suspended",
      { target: partner.id, reason: null, suspended: false });
    if (lift.error) throw new Error(`could not lift the suspension: ${lift.error.message}`);
  }
}

// ---------- 7. message after unmatching ----------

{
  // This one goes first, while the pair is still matched. Running it after the
  // owner unmatches would prove nothing, because the rows it must not touch
  // would already be gone.
  const meddle = await outsider.c.rpc("unmatch", { other: owner.id });
  const intact = await owner.c.from("connections").select("to_profile").eq("to_profile", partner.id);
  record("7. a third party unmatching a pair they are not in", "outsider",
    (intact.data?.length ?? 0) === 1,
    meddle.error
      ? said(meddle.error)
      : `the call ran; the pair still has ${intact.data?.length ?? 0} connection from the owner`);

  const un = await owner.c.rpc("unmatch", { other: partner.id });
  if (un.error) throw new Error(`setup, owner unmatches: ${un.error.message}`);

  for (const who of [owner, partner]) {
    const r = await who.c.from("messages")
      .insert({ conversation_id: conversation.id, sender_id: who.id, text: "Proof: sent after the unmatch." });
    record("7. send into the conversation after unmatching", who.label,
      Boolean(r.error), r.error ? said(r.error) : "sent");
  }
  for (const who of [owner, partner]) {
    const r = await who.c.from("conversations").select("id").eq("id", conversation.id);
    record("7. still read the conversation after unmatching", who.label,
      r.error ? true : r.data.length === 0,
      r.error ? said(r.error) : `${r.data.length} rows returned`);
  }

  // Put them back, so the run is repeatable and the thread is theirs again.
  must(await owner.c.from("connections").insert({ to_profile: partner.id }), "owner reconnects");
  must(await partner.c.from("connections").insert({ to_profile: owner.id }), "partner reconnects");
  const back = await owner.c.from("messages").select("id").eq("conversation_id", conversation.id);
  record("7. check: rematching reopens the same thread", "owner",
    !back.error && back.data.length > 0,
    back.error ? said(back.error) : `${back.data.length} message(s) still there`);
}

// ---------- 8. delete an account that is not yours ----------
//
// delete-account reads the member from the caller's token and never reads the
// request body, so there is no target to forge: the only attacks that do not
// destroy one of these fixtures are the ones that arrive without a usable
// token. The "ignores the body" property is structural, in
// supabase/functions/delete-account/index.ts, not something an attempt here
// can show without deleting the attacker's own account.

const deleteEndpoint = `${url}/functions/v1/delete-account`;

for (const [label, headers] of [
  ["no token at all", { apikey: key }],
  ["the publishable key as a bearer token", { apikey: key, Authorization: `Bearer ${key}` }],
  ["a forged bearer token", { apikey: key, Authorization: "Bearer not.a.real.token" }],
]) {
  let detail;
  try {
    const response = await fetch(deleteEndpoint, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ userId: owner.id, target: owner.id }),
    });
    const body = await response.text();
    detail = `${response.status} ${body.slice(0, 120)}`;
    record(`8. call delete-account with ${label}`, "anon",
      !response.ok, detail);
  } catch (e) {
    record(`8. call delete-account with ${label}`, "anon", true, e.message);
  }
}
{
  const r = await owner.c.from("profiles").select("id").eq("id", owner.id);
  record("8. check, as the owner: the account still exists", "owner",
    !r.error && r.data.length === 1,
    r.error ? said(r.error) : `${r.data.length} row(s)`);
}

// ---------- report, then tidy the photo away ----------

const width = Math.max(...results.map((r) => r.attempt.length));
for (const r of results) {
  console.log(`${r.refused ? "refused" : "ALLOWED"}  ${r.attempt.padEnd(width)}  as ${r.who.padEnd(9)}  ${r.detail}`);
}
await owner.c.storage.from(BUCKET).remove([photoPath]);

if (skipped.length) {
  console.log("");
  for (const s of skipped) console.log(`skipped  ${s}`);
}

const allowed = results.filter((r) => !r.refused).length;
console.log(`\n${results.length} attempts, ${results.length - allowed} refused, ${allowed} allowed`);
process.exit(allowed ? 1 : 0);
