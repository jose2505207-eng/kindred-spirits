/**
 * Card art: the short code for each card and where its face is served from.
 *
 * Codes are built from the engine's own parts(), so the art can never be keyed
 * to a name the engine does not produce. The faces ship with the app, in
 * public/card-art/ under a version prefix alongside their provenance, so they
 * load without an account; scripts/verify-cards.mjs checks them on every test
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

const BASE = (import.meta.env?.BASE_URL ?? "/").replace(/\/?$/, "/");

/** URL of a card's face in the app's own build, or null for a name with no code. */
export function cardArtUrl(name) {
  const code = cardCode(name);
  return code ? `${BASE}card-art/${CARD_ART_VERSION}/${code}.svg` : null;
}
