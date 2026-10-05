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

// A recovery link signs the member in and fires PASSWORD_RECOVERY. Until they
// have actually chosen a new password, AuthGate shows nothing but that form:
// otherwise a recovery link left in an inbox is a way into the account.
let recovering = false;

export const isRecovering = () => recovering;

const announce = () => {
  member = { ...member };
  listeners.forEach((fn) => fn(member));
};

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    const id = session?.user?.id ?? null;

    if (event === "PASSWORD_RECOVERY") recovering = true;
    else if (event === "SIGNED_OUT") recovering = false;

    const changed = !member.ready || member.id !== id;
    // A token refresh is not a new member, but entering recovery still has to
    // reach AuthGate even though the member has not changed.
    if (!changed && event !== "PASSWORD_RECOVERY") return;

    member = { ready: true, id };
    announce();
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
 * Sends a password recovery email. The link returns to this app's own origin,
 * which has to be in the project's allowed redirect URLs.
 *
 * The caller deliberately does not learn whether the address has an account:
 * Supabase answers the same either way, and so does the screen.
 */
export async function requestPasswordReset(email) {
  if (!supabase) throw new Error("This build has no backend configured.");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  if (error) throw new Error(error.message);
}

/** Sets a new password and leaves recovery, which lets the app open. */
export async function setNewPassword(password) {
  if (!supabase) throw new Error("This build has no backend configured.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
  recovering = false;
  announce();
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
