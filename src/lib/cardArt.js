/**
 * Card art: the short code for each card and where its face is served from.
 *
 * Codes are built from the engine's own parts(), so the art can never be keyed
 * to a name the engine does not produce. The faces live in the public card-art
 * Storage bucket under a version prefix. assets/card-art/ holds the same files
 * and their provenance, and scripts/verify-cards.mjs checks them on every test
 * run.
 */

import { JOKER, parts } from "../../engine/kindredEngine.js";

export const CARD_ART_VERSION = "v1";
export const JOKER_CODE = "JOK";
export const BACK_CODE = "BACK";

const SUIT_CODE = { Hearts: "H", Clubs: "C", Diamonds: "D", Spades: "S" };

/** "Ten of Hearts" -> "10H", the Joker -> "JOK", anything else -> null. */
export function cardCode(name) {
  if (name === JOKER) return JOKER_CODE;
  const p = parts(name);
  return p.rank && SUIT_CODE[p.suit] ? `${p.rank}${SUIT_CODE[p.suit]}` : null;
}

const BASE = import.meta.env?.VITE_SUPABASE_URL?.replace(/\/+$/, "");

/** Public URL of a card's face, or null when no backend is configured. */
export function cardArtUrl(name) {
  const code = cardCode(name);
  if (!BASE || !code) return null;
  return `${BASE}/storage/v1/object/public/card-art/${CARD_ART_VERSION}/${code}.svg`;
}
