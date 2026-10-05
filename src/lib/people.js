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
import { DEFAULT_GENDER, mutuallyInterested } from "./gender.js";
import { withinRadius } from "./place.js";
import { dataUrlToBlob, PHOTO_BUCKET, signedUrls } from "./photos.js";
import { readProfiles } from "../fixtures/profiles.js";

const PROFILE_COLUMNS = "id, display_name, birthdate, business, bio, is_visible, onboarded_at, "
  + "bowtie_emoji, bowtie_image_path, bowtie_backdrop, bowtie_caption, "
  + "suspended_at, suspended_reason, gender, interested_in, "
  + "lat, lon, radius_km, place_label";

const fail = (error) => { if (error) throw new Error(error.message); };
const ALREADY_EXISTS = "23505";

function toPerson(row, urls) {
  return {
    id: row.id,
    name: row.display_name,
    birthdate: row.birthdate,
    bio: row.bio ?? "",
    gender: row.gender ?? DEFAULT_GENDER,
    // What the view gives about where somebody is: a label they wrote and a
    // distance worked out for this viewer. Never their coordinates.
    placeLabel: row.place_label ?? null,
    distanceKm: row.distance_km ?? null,
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
    // A suspended member still reads their own row, which is how the app can
    // tell them why nothing works. See the report moderation migration.
    suspendedAt: row.suspended_at ?? null,
    suspendedReason: row.suspended_reason ?? null,
    // Only ever your own: public_profiles does not expose interested_in,
    // because who somebody is looking for is nobody else's business.
    interestedIn: row.interested_in ?? [],
    // Your own coordinates, which only ever come from your own row.
    lat: row.lat ?? null,
    lon: row.lon ?? null,
    radiusKm: row.radius_km ?? null,
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

/** The onboarding fields, which make the profile visible to others. */
export async function saveOnboarding(
  memberId,
  { name, birthdate, business, gender, interestedIn, lat, lon, radiusKm, placeLabel },
) {
  const onboardedAt = new Date().toISOString();
  const place = {
    lat: lat ?? null,
    lon: lon ?? null,
    radiusKm: radiusKm ?? null,
    placeLabel: placeLabel?.trim() || null,
  };
  if (DEMO) {
    demoMe = {
      id: "me", name, birthdate, business, bio: "", visible: true, onboardedAt,
      gender: gender ?? DEFAULT_GENDER, interestedIn: interestedIn ?? [],
      ...place,
      bowtie: { ...DEFAULT_BOWTIE, imagePath: null },
    };
    return demoMe;
  }
  const { data, error } = await supabase.from("profiles")
    .update({
      display_name: name, birthdate, business, onboarded_at: onboardedAt,
      gender: gender ?? DEFAULT_GENDER, interested_in: interestedIn ?? [],
      lat: place.lat, lon: place.lon,
      radius_km: place.radiusKm, place_label: place.placeLabel,
    })
    .eq("id", memberId).select(PROFILE_COLUMNS).single();
  fail(error);
  return toMe(data);
}

/**
 * Changing where you are, or how far you will look. Coordinates arrive already
 * rounded by src/lib/place.js; the database holds no more precision than that.
 */
export async function savePlace(memberId, { lat, lon, radiusKm, placeLabel }) {
  const next = {
    lat: lat ?? null,
    lon: lon ?? null,
    radiusKm: radiusKm ?? null,
    placeLabel: placeLabel?.trim() || null,
  };
  if (DEMO) {
    demoMe = { ...demoMe, ...next };
    return demoMe;
  }
  const { data, error } = await supabase.from("profiles")
    .update({
      lat: next.lat, lon: next.lon,
      radius_km: next.radiusKm, place_label: next.placeLabel,
    })
    .eq("id", memberId).select(PROFILE_COLUMNS).single();
  fail(error);
  return toMe(data);
}

/** Changing your gender or who you are interested in, after onboarding. */
export async function saveInterest(memberId, { gender, interestedIn }) {
  if (DEMO) {
    demoMe = { ...demoMe, gender, interestedIn };
    return demoMe;
  }
  const { data, error } = await supabase.from("profiles")
    .update({ gender, interested_in: interestedIn })
    .eq("id", memberId).select(PROFILE_COLUMNS).single();
  fail(error);
  return toMe(data);
}

/** Everyone the feed may rank, each with a reading for the connection being read. */
export async function loadCandidates(business) {
  // Signed in, public_profiles has already dropped anyone the two of you are
  // not mutually interested in. Demo mode has no database, so the same rule
  // from src/lib/gender.js runs here instead.
  if (DEMO) {
    return readProfiles(business)
      .filter((p) => !demoBlocked.has(p.id))
      .filter((p) => !demoMe || (mutuallyInterested(demoMe, p) && withinRadius(demoMe, p)));
  }
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

/**
 * Ends a match without blocking.
 *
 * Both connection rows go, so neither of you is left connected to the other and
 * connecting again needs both people a second time. The conversation then
 * disappears for both and neither can write into it — enforced by
 * my_conversation_ids(), not by this call. Nothing is destroyed: a later
 * rematch reopens the thread you already had.
 */
export async function unmatch(otherId) {
  if (DEMO) { demoConnected.delete(otherId); return; }
  const { error } = await supabase.rpc("unmatch", { other: otherId });
  fail(error);
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
