import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import {
  addPhoto, deletePhoto, listPhotos, movePhoto, PHOTO_CAPTION_MAX, PHOTO_MAX,
  setCaption, setPrimary,
} from "../lib/photos.js";

/**
 * Your photos, on About you: add, caption, reorder, choose the primary and
 * delete. Photos only exist with an account, so there is nothing in demo mode.
 */
export function PhotoManager({ memberId }) {
  const [photos, setPhotos] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [problem, setProblem] = useState(null);

  const reload = useCallback(async () => setPhotos(await listPhotos(memberId)), [memberId]);

  useEffect(() => {
    if (supabase) reload().catch((e) => setProblem(e.message));
  }, [reload]);

  if (!supabase) return null;

  const act = async (fn) => {
    setBusy(true);
    setProblem(null);
    setConfirming(null);
    try {
      await fn();
    } catch (e) {
      setProblem(e.message);
    }
    try { await reload(); } catch (e) { setProblem(e.message); }
    setBusy(false);
  };

  return (
    <section aria-labelledby="photos-h">
      <h2 className="ks-h" id="photos-h">Your photos</h2>
      <p className="ks-note">
        Shown on your profile to members who can see you, beside the reading
        rather than instead of it. Up to {PHOTO_MAX}; the primary comes first.
      </p>

      {photos?.length > 0 && (
        <ol className="photos">
          {photos.map((p, i) => (
            <li key={p.id} className={`photo${p.primary ? " primary" : ""}`}>
              {p.url
                ? <img src={p.url} alt={p.caption || `Photo ${i + 1}`} />
                : <span className="photo-missing">Unavailable</span>}
              <div className="photo-body">
                <CaptionField photo={p} disabled={busy}
                  onSave={(caption) => act(() => setCaption(p.id, caption))} />
                <div className="photo-actions">
                  {p.primary
                    ? <span className="photo-flag">Primary</span>
                    : <button type="button" className="linkish" disabled={busy}
                        onClick={() => act(() => setPrimary(p.id))}>Make primary</button>}
                  <button type="button" className="linkish" disabled={busy || i === 0}
                    onClick={() => act(() => movePhoto(photos, i, -1))}>Earlier</button>
                  <button type="button" className="linkish" disabled={busy || i === photos.length - 1}
                    onClick={() => act(() => movePhoto(photos, i, 1))}>Later</button>
                  {confirming === p.id
                    ? <button type="button" className="linkish danger" disabled={busy}
                        onClick={() => act(() => deletePhoto(p, photos))}>Delete for good</button>
                    : <button type="button" className="linkish" disabled={busy}
                        onClick={() => setConfirming(p.id)}>Delete</button>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {photos && photos.length < PHOTO_MAX && (
        <label className={`ks-ghost upload${busy ? " busy" : ""}`}>
          {busy ? "One moment…" : photos.length ? "Add another photo" : "Add a photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) act(() => addPhoto(memberId, file, photos));
            }} />
        </label>
      )}
      {problem && <p className="problem" role="alert">{problem}</p>}
    </section>
  );
}

function CaptionField({ photo, disabled, onSave }) {
  const [value, setValue] = useState(photo.caption);
  useEffect(() => setValue(photo.caption), [photo.caption]);
  const commit = () => { if (value.trim() !== photo.caption) onSave(value); };
  return (
    <input className="photo-caption" value={value} maxLength={PHOTO_CAPTION_MAX} disabled={disabled}
      placeholder="Add a caption" aria-label="Caption"
      onChange={(e) => setValue(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
  );
}

/** Someone else's photos, primary first, on the profile you open from Matches. */
export function PhotoStrip({ profileId, name }) {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (!supabase) return undefined;
    let live = true;
    listPhotos(profileId)
      .then((list) => { if (live) setPhotos(list.filter((p) => p.url)); })
      .catch(() => { if (live) setPhotos([]); });
    return () => { live = false; };
  }, [profileId]);

  if (!photos.length) return null;
  const ordered = [...photos].sort((a, b) => Number(b.primary) - Number(a.primary) || a.position - b.position);

  return (
    <ul className="photo-strip" aria-label={`Photos of ${name}`}>
      {ordered.map((p) => (
        <li key={p.id}>
          <figure>
            <img src={p.url} alt={p.caption || `A photo of ${name}`} loading="lazy" />
            {p.caption && <figcaption>{p.caption}</figcaption>}
          </figure>
        </li>
      ))}
    </ul>
  );
}
