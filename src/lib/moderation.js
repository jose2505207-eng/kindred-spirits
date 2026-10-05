/**
 * Moderation: who moderates, the reports they read, and suspending a profile.
 *
 * Nothing here is trusted to enforce anything. private.is_moderator() backs the
 * policies on reports and profiles, so a member who is not in the moderators
 * table gets no rows and no writes however they call these; and suspension goes
 * through set_profile_suspended(), not a column write, because granting
 * suspended_at to members would let a suspended one lift their own suspension.
 *
 * Demo mode has no accounts and so no moderators: every call here is inert.
 */

import { DEMO, supabase } from "./supabase.js";

const fail = (error) => { if (error) throw new Error(error.message); };

const REPORT_COLUMNS = "id, reason, status, created_at, reviewed_at, action_note, "
  + "reporter_id, reported_id, reported_deleted_at, message_id";

/**
 * Whether the signed-in member moderates. The moderators policy only ever
 * returns your own row, so this is the only question it can answer.
 */
export async function amIModerator(memberId) {
  if (DEMO || !supabase || !memberId) return false;
  const { data, error } = await supabase.from("moderators")
    .select("profile_id").eq("profile_id", memberId).maybeSingle();
  if (error) return false;
  return Boolean(data);
}

/** Display name and suspension state for a set of profile ids, as a Map. */
async function peopleFor(ids) {
  const wanted = [...new Set(ids.filter(Boolean))];
  if (!wanted.length) return new Map();
  const { data, error } = await supabase.from("profiles")
    .select("id, display_name, suspended_at, suspended_reason").in("id", wanted);
  if (error) return new Map();
  return new Map(data.map((row) => [row.id, {
    id: row.id,
    name: row.display_name,
    suspendedAt: row.suspended_at ?? null,
    suspendedReason: row.suspended_reason ?? null,
  }]));
}

/**
 * Reports, newest first. `status` is "open", "actioned", "dismissed" or "all".
 * A non-moderator gets an empty list rather than an error, because the policy
 * narrows rows instead of refusing the query.
 */
export async function listReports(status = "open") {
  if (DEMO || !supabase) return [];

  let query = supabase.from("reports").select(REPORT_COLUMNS)
    .order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  fail(error);

  const people = await peopleFor(data.flatMap((r) => [r.reporter_id, r.reported_id]));
  return data.map((r) => ({
    id: r.id,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    actionNote: r.action_note ?? "",
    messageId: r.message_id,
    reporter: people.get(r.reporter_id) ?? null,
    reported: r.reported_id ? people.get(r.reported_id) ?? null : null,
    // Set when the reported account was deleted: the report outlives it,
    // stripped of who it was about.
    reportedDeletedAt: r.reported_deleted_at,
  }));
}

/** Records a decision on a report. The four columns below are the only writes. */
export async function reviewReport(reportId, { status, note }, memberId) {
  const { error } = await supabase.from("reports").update({
    status,
    action_note: note?.trim() || null,
    reviewed_by: memberId,
    reviewed_at: new Date().toISOString(),
  }).eq("id", reportId);
  fail(error);
}

/**
 * Suspends a profile, or lifts a suspension. A suspended member drops out of
 * every feed, cannot message, and is told why when they next open the app.
 */
export async function setSuspended(profileId, { suspended, reason } = { suspended: true }) {
  const { error } = await supabase.rpc("set_profile_suspended", {
    target: profileId,
    reason: suspended ? (reason?.trim() || null) : null,
    suspended,
  });
  fail(error);
}
