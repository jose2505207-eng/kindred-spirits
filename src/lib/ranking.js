/**
 * Candidate ranking.
 *
 * Every signal here is one the disclosure already defines — see the Ranking
 * section of docs/DESIGN.md. Nothing invents a compatibility metric on top,
 * and nothing re-implements the engine: this file only composes functions and
 * tables exported from engine/kindredEngine.js.
 *
 * The tier ladder is calibrated against the disclosure's four Output Examples.
 * engine.test.mjs pins two of them to specific pairs (example 1, a natural
 * fit, and example 4, a rejection); the middle two name a verdict but not a
 * pair, so those are inferred from the five worked people:
 *
 *   example 1  May 31 1961 x Jan 25 1971  love      -> a natural fit
 *   example 2  May 31 1961 x Feb 17 1963  business  -> strongly compatible
 *   example 3  (either candidate pairing) love      -> marginally compatible
 *   example 4  May 31 1961 x Nov 28 1989  love      -> a challenging match
 *
 * Note this deliberately does not match the ladder in
 * app/KindredSpirits.prototype.jsx, which promotes example 2 to "a natural
 * fit" and example 3 to "strongly compatible".
 */

import {
  compare, diagonalPositions, DECK_ARRAY,
  SPIRITUAL_DECK, LIFE_DECK, SPIRITUAL_INDEX, LIFE_INDEX,
} from "../../engine/kindredEngine.js";

const namesAt = (n, offset, deck) =>
  diagonalPositions(n, offset).map(([r, c]) => deck[DECK_ARRAY[r][c]]);

/**
 * Cards sitting on both the Birth Card diagonals and the Karma Birth Card
 * diagonals — "a rare and powerful match" (docs/DESIGN.md). compare() does not
 * expose this, so it is composed from the exported tables. Depends only on the
 * reader, so callers compute it once and pass it in.
 */
export function rareCards(fc) {
  if (!fc.birthCardNumber) return new Set();               // the Joker
  const karmaBirth = LIFE_DECK[SPIRITUAL_INDEX[fc.birthCard]];
  const diagonalsOf = (name) => new Set([
    ...namesAt(SPIRITUAL_INDEX[name], fc.offset, SPIRITUAL_DECK),
    ...namesAt(LIFE_INDEX[name], fc.offset, LIFE_DECK),
  ]);
  const birth = diagonalsOf(fc.birthCard);
  const karma = diagonalsOf(karmaBirth);
  return new Set([...birth].filter((c) => karma.has(c)));
}

/** Index 3 is the strongest. The strings are the disclosure's own register. */
export const TIERS = [
  "a challenging match",
  "marginally compatible",
  "strongly compatible",
  "a natural fit",
];

export function evaluate(me, them, rare = rareCards(me)) {
  const cmp = compare(me, them);
  const hits = [...new Set([...cmp.aMatches, ...cmp.bMatches])];
  const mutual = cmp.aMatches.length > 0 && cmp.bMatches.length > 0;
  const rareHits = hits.filter((c) => rare.has(c));
  const lp = cmp.lifePath;

  let tier;
  if (rareHits.length || (mutual && lp === "natural" && hits.length >= 3)) tier = 3;
  else if ((mutual && lp) || (hits.length >= 2 && lp === "natural")) tier = 2;
  else if (hits.length || lp) tier = 1;
  else tier = 0;

  // Tier is the sort key. The remainder only orders rows inside one tier, so
  // the feed never disagrees with the verdict the row opens.
  const score = tier * 100
    + rareHits.length * 12
    + (mutual ? 8 : 0)
    + hits.length * 4
    + (lp === "natural" ? 3 : lp === "lesser" ? 1 : 0);

  return { cmp, hits, mutual, rare: rareHits, lp, tier, headline: TIERS[tier], score };
}

/** Profiles, strongest first. Ties break on name so the feed is stable. */
export function rank(me, profiles) {
  const rare = rareCards(me);
  return profiles
    .map((p) => ({ profile: p, ...evaluate(me, p.fc, rare) }))
    .sort((a, b) => b.score - a.score || a.profile.name.localeCompare(b.profile.name));
}
