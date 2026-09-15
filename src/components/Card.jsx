import React, { useState } from "react";
import { parts, SUIT_GLYPH } from "../../engine/kindredEngine.js";
import { cardArtUrl } from "../lib/cardArt.js";

const SIZE = { chip: "chip", sm: "card-sm", lg: "card-lg", xl: "card-xl" };

// A printed face is only legible from lg up; smaller sizes keep the drawn chip.
const ART_SIZES = new Set(["lg", "xl"]);

/**
 * A card face. Carried over from app/KindredSpirits.prototype.jsx.
 *
 * At lg and xl the real face from the card-art bucket is laid over the drawn
 * card and shown once it has loaded. Until then, or if it cannot load, or with
 * no backend configured, the drawn card stays.
 */
export default function Card({ name, size = "chip", hit = false, className = "" }) {
  const p = parts(name);
  const art = ART_SIZES.has(size) ? cardArtUrl(name) : null;
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(null);
  const showArt = Boolean(art) && loaded === art;

  const cls = `card ${SIZE[size] || SIZE.chip} ${p.red ? "red" : ""}`
    + `${hit ? " hit" : ""}${showArt ? " has-art" : ""} ${className}`;
  const label = p.suit ? name : "Joker";

  // The Joker sits in neither spread, so it has no rank or suit to print.
  const drawn = p.suit
    ? <>
        <span className="idx">{p.rank}<i>{SUIT_GLYPH[p.suit]}</i></span>
        <span className="pip">{SUIT_GLYPH[p.suit]}</span>
      </>
    : <span className="pip">★</span>;

  return (
    <div className={cls} title={label} aria-label={label}>
      {!showArt && drawn}
      {art && failed !== art && (
        <img className={`art${showArt ? "" : " loading"}`} src={art} alt=""
          draggable="false" decoding="async"
          onLoad={() => setLoaded(art)} onError={() => setFailed(art)} />
      )}
    </div>
  );
}

/** The patterned reverse, used only during the reveal. */
export function CardBack({ size = "xl" }) {
  return <div className={`card card-back ${SIZE[size] || SIZE.xl}`} aria-hidden="true" />;
}
