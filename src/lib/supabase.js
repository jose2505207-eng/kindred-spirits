/**
 * The Supabase client, and who is signed in.
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. The publishable
 * key is meant to ship in the bundle: everything it can reach is limited by
 * RLS. With VITE_DEMO_MODE=true there is no client at all, and the app runs on
 * the seeded fixtures with no accounts.
 */

import { createClient } from "@supabase/supabase-js";

const env = import.meta.env ?? {};

export const DEMO = env.VITE_DEMO_MODE === "true";

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = !DEMO && url && key ? createClient(url, key) : null;

// Who is signed in. `ready` turns true once the stored session has been read.
let member = { ready: !supabase, id: null };
const listeners = new Set();

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    const id = session?.user?.id ?? null;
    if (member.ready && member.id === id) return;   // a token refresh, not a new member
    member = { ready: true, id };
    listeners.forEach((fn) => fn(member));
  });
}

export const currentMember = () => member;

/** Calls `fn` whenever the signed-in member changes. Returns the unsubscribe. */
export function onMemberChange(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

/**
 * Deletes the signed-in member's account for good.
 *
 * The work is the delete-account Edge Function, which empties their Storage
 * folder with the service role and then removes the auth user, cascading every
 * row they own. It takes no arguments on purpose: the function reads the member
 * from the caller's own token, so there is no request that deletes anyone else.
 * The session goes with the account, which drops the app back to SignIn.
 */
export async function deleteAccount() {
  if (!supabase) throw new Error("This build has no backend configured.");

  const { data, error } = await supabase.functions.invoke("delete-account", { method: "POST" });

  if (error) {
    // invoke() reports a non-2xx as a generic message; the reason is in the body.
    let detail = error.message;
    try {
      detail = (await error.context?.json())?.error ?? detail;
    } catch { /* no JSON body; the generic message is all there is */ }
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);

  await supabase.auth.signOut();
  return data;
}
