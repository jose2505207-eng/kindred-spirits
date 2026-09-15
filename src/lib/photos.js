/**
 * Profile photos: the private profile-photos bucket and the profile_photos
 * table.
 *
 * Photos are shown through signed URLs that last an hour, so a block or a
 * hidden profile withdraws them within the hour rather than never. A photo is
 * deleted by deleting its file; the database then removes the row (see the
 * profile_photos migration), which is why there is no row delete here.
 */

import { supabase } from "./supabase.js";

export const PHOTO_BUCKET = "profile-photos";
export const PHOTO_MAX = 6;
export const PHOTO_CAPTION_MAX = 140;

const SIGNED_FOR_SECONDS = 60 * 60;
const MAX_SIDE = 1600;
const MAX_BYTES = 5 * 1024 * 1024;

const fail = (error) => { if (error) throw new Error(error.message); };

/** Signed URLs for Storage paths, as a Map. Paths that cannot be signed are left out. */
export async function signedUrls(paths) {
  const wanted = [...new Set(paths.filter(Boolean))];
  if (!supabase || !wanted.length) return new Map();
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(wanted, SIGNED_FOR_SECONDS);
  if (error) return new Map();
  return new Map(data.filter((d) => d.signedUrl && !d.error).map((d) => [d.path, d.signedUrl]));
}

export const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

/** A profile's photos in their order, each with a signed URL (or null). */
export async function listPhotos(profileId) {
  const { data, error } = await supabase.from("profile_photos")
    .select("id, storage_path, caption, position, is_primary, created_at")
    .eq("profile_id", profileId)
    .order("position")
    .order("created_at");
  fail(error);
  const urls = await signedUrls(data.map((p) => p.storage_path));
  return data.map((p) => ({
    id: p.id,
    path: p.storage_path,
    caption: p.caption ?? "",
    position: p.position,
    primary: p.is_primary,
    url: urls.get(p.storage_path) ?? null,
  }));
}

/** Uploads a photo into your own folder, then records it. The first photo is the primary. */
export async function addPhoto(memberId, file, photos) {
  const blob = await resizePhoto(file);
  const path = `${memberId}/${crypto.randomUUID()}.jpg`;
  const upload = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  fail(upload.error);

  const position = photos.reduce((n, p) => Math.max(n, p.position + 1), 0);
  const { error } = await supabase.from("profile_photos")
    .insert({ storage_path: path, position, is_primary: photos.length === 0 });
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    fail(error);
  }
}

export async function setCaption(photoId, caption) {
  const { error } = await supabase.from("profile_photos")
    .update({ caption: caption.trim() || null }).eq("id", photoId);
  fail(error);
}

/** The database demotes the previous primary in the same statement. */
export async function setPrimary(photoId) {
  const { error } = await supabase.from("profile_photos").update({ is_primary: true }).eq("id", photoId);
  fail(error);
}

/** Moves one photo a step earlier (-1) or later (+1), renumbering whatever shifted. */
export async function movePhoto(photos, index, step) {
  const to = index + step;
  if (to < 0 || to >= photos.length) return;
  const order = [...photos];
  [order[index], order[to]] = [order[to], order[index]];
  const changed = order
    .map((p, position) => ({ id: p.id, from: p.position, position }))
    .filter((p) => p.from !== p.position);
  const results = await Promise.all(changed.map((p) =>
    supabase.from("profile_photos").update({ position: p.position }).eq("id", p.id)));
  results.forEach((r) => fail(r.error));
}

/** Deletes a photo's file, which removes its row. If it was the primary, the next photo takes over. */
export async function deletePhoto(photo, photos) {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).remove([photo.path]);
  fail(error);
  if (!data?.length) throw new Error("That photo could not be deleted.");
  const next = photos.find((p) => p.id !== photo.id);
  if (photo.primary && next) await setPrimary(next.id);
}

/** Scales a photo so its longer side is at most 1600px and re-encodes it as JPEG. */
export function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("That file is not an image."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";                  // JPEG has no transparency
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error("That image could not be read."));
        else if (blob.size > MAX_BYTES) reject(new Error("That photo is still over 5 MB once resized."));
        else resolve(blob);
      }, "image/jpeg", 0.86);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be read."));
    };
    img.src = url;
  });
}
