import React from "react";
import { parts, SUIT_GLYPH } from "../../engine/kindredEngine.js";

const SIZE = { chip: "chip", sm: "card-sm", lg: "card-lg", xl: "card-xl" };

/** A card face. Carried over from app/KindredSpirits.prototype.jsx. */
export default function Card({ name, size = "chip", hit = false, className = "" }) {
  const p = parts(name);
  const cls = `card ${SIZE[size] || SIZE.chip} ${p.red ? "red" : ""}`
    + `${hit ? " hit" : ""} ${className}`;

  // The Joker sits in neither spread, so it has no rank or suit to print.
  if (!p.suit) {
    return (
      <div className={cls} title="Joker" aria-label="Joker">
        <span className="pip">★</span>
      </div>
    );
  }

  return (
    <div className={cls} title={name} aria-label={name}>
      <span className="idx">{p.rank}<i>{SUIT_GLYPH[p.suit]}</i></span>
      <span className="pip">{SUIT_GLYPH[p.suit]}</span>
    </div>
  );
}

/** The patterned reverse, used only during the reveal. */
export function CardBack({ size = "xl" }) {
  return <div className={`card card-back ${SIZE[size] || SIZE.xl}`} aria-hidden="true" />;
}
