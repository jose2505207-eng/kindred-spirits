// Deletes the caller's own account, and nothing else.
//
// Why this is a function and not SQL: rows cascade from auth.users, but Storage
// files do not. Supabase will not let SQL delete a storage object, and deleting
// the row would leave the file in the bucket either way, so the person's folder
// has to be emptied over the Storage API *before* the account goes. That
// ordering is the whole reason this runs with the service role.
//
// The user id always comes from the caller's own JWT. Nothing in the request
// body is read, so there is no shape of request that deletes somebody else's
// account — see the "delete another member's account" attempt in
// scripts/rls-proof.mjs.
//
// Photos and bowtie faces are both objects under {user_id}/ in the single
// profile-photos bucket, so one folder sweep covers both.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "profile-photos";
const PAGE = 100;
const MAX_PAGES = 100;        // 10,000 objects; a person is capped at 7

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/**
 * Removes every object under {userId}/ in the photo bucket. Returns how many
 * went, or a message if the bucket refused — in which case the caller keeps
 * their account rather than losing the rows and keeping the files.
 */
async function emptyFolder(admin: SupabaseClient, userId: string) {
  let removed = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await admin.storage.from(BUCKET).list(userId, { limit: PAGE });
    if (error) return { error: `listing the folder: ${error.message}` };
    if (!data || data.length === 0) return { removed };

    const paths = data.map((f) => `${userId}/${f.name}`);
    const { data: gone, error: removeError } = await admin.storage.from(BUCKET).remove(paths);
    if (removeError) return { error: `removing files: ${removeError.message}` };

    // Nothing went even though the folder listed objects: stop rather than
    // spin, and leave the account alone.
    if (!gone || gone.length === 0) {
      return { error: `the bucket listed ${paths.length} files but removed none` };
    }
    removed += gone.length;
  }

  return { error: "that folder holds more files than this function will sweep" };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Sign in to delete your account." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "This function is not configured." }, 500);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Who is asking. A forged, expired or anon token resolves to no user, and
  // nothing is deleted.
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: who, error: whoError } = await admin.auth.getUser(token);
  if (whoError || !who?.user) return json({ error: "That session is not valid." }, 401);
  const userId = who.user.id;

  // 1. The files, first.
  const swept = await emptyFolder(admin, userId);
  if ("error" in swept) return json({ error: swept.error }, 500);

  // 2. Then the account. Every app table that references a person cascades from
  //    auth.users, and a trigger clears the conversation each membership leaves
  //    behind — see the account deletion migration.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ deleted: true, filesRemoved: swept.removed });
});
