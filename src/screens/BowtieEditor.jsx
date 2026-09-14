import React, { useState } from "react";
import Bowtie from "../components/Bowtie.jsx";
import {
  BACKDROPS, CAPTION_MAX, EMOJI_PICKS, firstEmoji, readFaceImage,
} from "../lib/bowtie.js";

/**
 * Make or change your bowtie, as often as you like. Reached from About you and
 * from the community wall; nothing changes until Save.
 */
export default function BowtieEditor({ bowtie, onSave, onCancel }) {
  const [draft, setDraft] = useState(bowtie);
  const [kind, setKind] = useState(bowtie.image ? "image" : "emoji");
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState(null);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  // An uploaded image stays in the draft while you look at emoji, so the
  // switch can be undone; only the face that is chosen at Save is kept.
  const result = {
    ...draft,
    image: kind === "image" ? draft.image : null,
    caption: draft.caption.trim(),
  };
  const ready = kind === "emoji" || Boolean(draft.image);
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();
  const custom = !BACKDROPS.some((b) => same(b.hex, draft.backdrop));

  const onType = (e) => {
    const v = e.target.value;
    setTyped(v);
    if (!v.trim()) { setProblem(null); return; }
    const emoji = firstEmoji(v);
    if (emoji) { set({ emoji }); setProblem(null); }
    else setProblem("Only an emoji fits the knot — letters and numbers will not.");
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      set({ image: await readFaceImage(file) });
      setProblem(null);
    } catch (err) {
      setProblem(err.message);
    }
  };

  return (
    <div className="ks flat">
      <button className="back" onClick={onCancel}>‹ Cancel</button>
      <h1 className="ks-mark">Your bowtie</h1>
      <p className="ks-sub">
        Your emblem in place of a photo. It sits on your profile, beside you in
        matches and on the community wall. Change it whenever you like.
      </p>

      <div className="emblem">
        <Bowtie bowtie={result} size="lg" label="Preview of your bowtie" />
        <p className={`emblem-cap${result.caption ? "" : " empty"}`}>
          {result.caption || "Your caption shows here."}
        </p>
      </div>

      <h2 className="ks-h">Face</h2>
      <div className="ks-seg" role="group" aria-label="Face">
        <button type="button" aria-pressed={kind === "emoji"} onClick={() => setKind("emoji")}>
          <b>Emoji</b>pick or type one
        </button>
        <button type="button" aria-pressed={kind === "image"} onClick={() => setKind("image")}>
          <b>Image</b>upload your own
        </button>
      </div>

      {kind === "emoji" ? (
        <>
          <div className="picks" role="group" aria-label="Emoji">
            {EMOJI_PICKS.map((e) => (
              <button key={e} type="button" aria-pressed={draft.emoji === e}
                onClick={() => { set({ emoji: e }); setTyped(""); setProblem(null); }}>
                {e}
              </button>
            ))}
          </div>
          <label className="ks-field">
            <span>Or type any emoji</span>
            <input value={typed} onChange={onType} autoComplete="off" />
          </label>
        </>
      ) : (
        <>
          <label className="ks-ghost upload">
            {draft.image ? "Choose a different image" : "Choose an image"}
            <input type="file" accept="image/*" onChange={onFile} hidden />
          </label>
          {draft.image && (
            <button type="button" className="linkish" onClick={() => set({ image: null })}>
              Remove image
            </button>
          )}
          <p className="ks-note" style={{ marginTop: 10 }}>
            Cropped to a square. It stays on this phone.
          </p>
        </>
      )}
      {problem && <p className="problem" role="alert">{problem}</p>}

      <hr className="ks-rule" />
      <h2 className="ks-h">Backdrop</h2>
      <div className="swatches" role="group" aria-label="Backdrop colour">
        {BACKDROPS.map((b) => (
          <button key={b.id} type="button" className="swatch" title={b.label}
            aria-label={b.label} aria-pressed={same(b.hex, draft.backdrop)}
            style={{ background: b.hex }} onClick={() => set({ backdrop: b.hex })} />
        ))}
        <label className={`swatch-custom${custom ? " on" : ""}`}>
          <input type="color" value={draft.backdrop}
            onChange={(e) => set({ backdrop: e.target.value })} />
          Any colour
        </label>
      </div>

      <hr className="ks-rule" />
      <label className="ks-field">
        <span>Caption <em className="count">{draft.caption.length} of {CAPTION_MAX}</em></span>
        <input value={draft.caption} maxLength={CAPTION_MAX}
          onChange={(e) => set({ caption: e.target.value.replace(/\s+/g, " ") })} />
      </label>

      <div className="actions">
        <button className="ks-ghost" onClick={onCancel}>Cancel</button>
        <button className="ks-go" onClick={() => onSave(result)} disabled={!ready}>
          Save bowtie
        </button>
      </div>
    </div>
  );
}
