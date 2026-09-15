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
