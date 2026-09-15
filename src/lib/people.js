/**
 * People: your own profile, the candidates the feed ranks, connections,
 * blocks, reports and bowties.
 *
 * Signed in, this reads and writes Supabase; in demo mode it serves the seeded
 * fixtures from memory. Either way it hands back plain people with readings
 * attached by the engine on this device — the database holds birthdates, never
 * a reading, a card or a tier. Messages are not here; they belong to
 * src/lib/messaging.js alone.
 */

import { DEMO, supabase } from "./supabase.js";
import { withReading } from "./reading.js";
import { DEFAULT_BOWTIE } from "./bowtie.js";
import { dataUrlToBlob, PHOTO_BUCKET, signedUrls } from "./photos.js";
import { readProfiles } from "../fixtures/profiles.js";

const PROFILE_COLUMNS = "id, display_name, birthdate, business, bio, is_visible, onboarded_at, "
  + "bowtie_emoji, bowtie_image_path, bowtie_backdrop, bowtie_caption";

const fail = (error) => { if (error) throw new Error(error.message); };
const ALREADY_EXISTS = "23505";

function toPerson(row, urls) {
  return {
    id: row.id,
    name: row.display_name,
    birthdate: row.birthdate,
    bio: row.bio ?? "",
    bowtie: {
      emoji: row.bowtie_emoji,
      image: urls.get(row.bowtie_image_path) ?? null,
      imagePath: row.bowtie_image_path ?? null,
      backdrop: row.bowtie_backdrop,
      caption: row.bowtie_caption,
    },
  };
}

async function toMe(row) {
  const urls = await signedUrls([row.bowtie_image_path]);
  return {
    ...toPerson(row, urls),
    business: row.business,
    visible: row.is_visible,
    onboardedAt: row.onboarded_at,
  };
}

// Demo mode: one visitor, no accounts, nothing survives a reload.
let demoMe = null;
const demoConnected = new Set();
const demoBlocked = new Set();

/** Your profile. In demo mode, null until onboarding. */
export async function loadMe(memberId) {
  if (DEMO) return demoMe;
  const { data, error } = await supabase.from("profiles")
    .select(PROFILE_COLUMNS).eq("id", memberId).single();
  fail(error);
  return toMe(data);
}

/** The three onboarding fields, which make the profile visible to others. */
export async function saveOnboarding(memberId, { name, birthdate, business }) {
  const onboardedAt = new Date().toISOString();
  if (DEMO) {
    demoMe = {
      id: "me", name, birthdate, business, bio: "", visible: true, onboardedAt,
      bowtie: { ...DEFAULT_BOWTIE, imagePath: null },
    };
    return demoMe;
  }
  const { data, error } = await supabase.from("profiles")
    .update({ display_name: name, birthdate, business, onboarded_at: onboardedAt })
    .eq("id", memberId).select(PROFILE_COLUMNS).single();
  fail(error);
  return toMe(data);
}

/** Everyone the feed may rank, each with a reading for the connection being read. */
export async function loadCandidates(business) {
  if (DEMO) return readProfiles(business).filter((p) => !demoBlocked.has(p.id));
  const { data, error } = await supabase.from("public_profiles").select("*");
  fail(error);
  const urls = await signedUrls(data.map((row) => row.bowtie_image_path));
  return data.map((row) => withReading(toPerson(row, urls), business));
}

/** The ids of the people you have connected with. */
export async function loadConnected(memberId) {
  if (DEMO) return new Set(demoConnected);
  const { data, error } = await supabase.from("connections")
    .select("to_profile").eq("from_profile", memberId);
  fail(error);
  return new Set(data.map((row) => row.to_profile));
}

export async function connect(otherId) {
  if (DEMO) { demoConnected.add(otherId); return; }
  const { error } = await supabase.from("connections").insert({ to_profile: otherId });
  if (error?.code !== ALREADY_EXISTS) fail(error);
}

/** Both of you drop out of each other's app; the database enforces it. */
export async function block(otherId) {
  if (DEMO) { demoBlocked.add(otherId); return; }
  const { error } = await supabase.from("blocks").insert({ blocked_id: otherId });
  if (error?.code !== ALREADY_EXISTS) fail(error);
}

export async function report(otherId, reason) {
  if (DEMO) return;
  const { error } = await supabase.from("reports").insert({ reported_id: otherId, reason: reason.trim() });
  fail(error);
}

/**
 * Saves a bowtie. A newly chosen face image arrives as a data URL from
 * readFaceImage (already a 256px square); it is uploaded into your folder, and
 * the image it replaces is deleted.
 */
export async function saveBowtie(memberId, bowtie, previous) {
  if (DEMO) return { ...bowtie, imagePath: null };

  let imagePath = null;
  if (bowtie.image?.startsWith("data:")) {
    imagePath = `${memberId}/${crypto.randomUUID()}.png`;
    const { error } = await supabase.storage.from(PHOTO_BUCKET)
      .upload(imagePath, await dataUrlToBlob(bowtie.image), { contentType: "image/png" });
    fail(error);
  } else if (bowtie.image) {
    imagePath = previous.imagePath;
  }

  const { data, error } = await supabase.from("profiles").update({
    bowtie_emoji: bowtie.emoji,
    bowtie_image_path: imagePath,
    bowtie_backdrop: bowtie.backdrop.toLowerCase(),
    bowtie_caption: bowtie.caption,
  }).eq("id", memberId).select(PROFILE_COLUMNS).single();

  if (error) {
    if (imagePath && imagePath !== previous.imagePath) {
      await supabase.storage.from(PHOTO_BUCKET).remove([imagePath]);
    }
    fail(error);
  }
  if (previous.imagePath && previous.imagePath !== imagePath) {
    await supabase.storage.from(PHOTO_BUCKET).remove([previous.imagePath]);
  }
  return (await toMe(data)).bowtie;
}

/** Calls `onChange` when a connection to or from you changes. Returns the unsubscribe. */
export function watchConnections(memberId, onChange) {
  if (DEMO || !supabase) return () => {};
  const channel = supabase.channel(`connections:${memberId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
