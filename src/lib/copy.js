/**
 * Reading copy.
 *
 * Every sentence is built from what the reading actually produced — no
 * generic filler. Register follows the disclosure's Output Examples, per
 * CLAUDE.md: sentence case, "a natural fit", "marginally compatible".
 */

/** Is this card their birth card or one of their ruling cards? */
export function roleOf(card, fc) {
  return card === fc.birthCard ? "birth card" : "ruling card";
}

const first = (list) => list[0];

/**
 * The one-line reason shown on a feed row. Names the strongest true signal,
 * drawn from the actual match rather than described in the abstract.
 */
export function reasonFor(ev, me, them) {
  const { rare, cmp, mutual, lp } = ev;

  // Kept to roughly two lines at 390px — the feed clamps, and a clipped
  // reason is worse than a shorter one. The full account is in the reading.
  if (rare.length) {
    return `The ${first(rare)} sits where your Birth Card and Karma Card `
      + `diagonals cross.`;
  }
  if (mutual) {
    const mine = first(cmp.bMatches);
    return `Mutual — their ${first(cmp.aMatches)} is in your list, and your `
      + `${roleOf(mine, me)} is in theirs.`;
  }
  if (cmp.aMatches.length) {
    const c = first(cmp.aMatches);
    return `Their ${roleOf(c, them)}, the ${c}, is in your Kindred Spirits list.`;
  }
  if (cmp.bMatches.length) {
    return `Your ${roleOf(first(cmp.bMatches), me)} is in their Kindred `
      + `Spirits list.`;
  }
  if (lp === "natural") {
    return `Life path ${me.lifePath} and ${them.lifePath} share a row of the `
      + `Pythagorean matrix.`;
  }
  if (lp === "lesser") {
    return `Life path ${me.lifePath} and ${them.lifePath} are compatible to a `
      + `lesser extent.`;
  }
  return `No cards in common, and the life paths do not connect.`;
}

/** The card paragraph of a match reading. */
export function cardsParagraph(ev, me, them) {
  const { cmp, mutual, rare } = ev;

  if (!cmp.aMatches.length && !cmp.bMatches.length) {
    return `Neither their birth card nor their ruling card appears in your `
      + `Kindred Spirits list, and yours do not appear in theirs.`;
  }

  const bits = [];
  if (cmp.aMatches.length) {
    const named = cmp.aMatches.map((c) => `the ${c} (their ${roleOf(c, them)})`);
    bits.push(`Your Kindred Spirits list contains ${joinList(named)}.`);
  }
  if (cmp.bMatches.length) {
    const named = cmp.bMatches.map((c) => `the ${c} (your ${roleOf(c, me)})`);
    bits.push(`${cmp.aMatches.length ? "Theirs contains" : "Their list contains"} `
      + `${joinList(named)}.`);
  }
  bits.push(mutual
    ? `The match runs both ways.`
    : `It runs one way only — the reverse does not hold.`);
  if (rare.length) {
    bits.push(`${joinList(rare.map((c) => `The ${c}`))} also sits where the Birth `
      + `Card diagonals cross the Karma Card diagonals, which the disclosure `
      + `singles out as rare and powerful.`);
  }
  return bits.join(" ");
}

/** The life-path paragraph of a match reading. */
export function lifePathParagraph(ev, me, them) {
  if (ev.lp === "natural") {
    return `Life path ${me.lifePath} and ${them.lifePath} sit in the same row of `
      + `the Pythagorean matrix — a natural pairing.`;
  }
  if (ev.lp === "lesser") {
    return `Life path ${me.lifePath} and ${them.lifePath} appear in the `
      + `lesser-compatibility array: workable, but it asks for effort.`;
  }
  return `Life path ${me.lifePath} and ${them.lifePath} connect in neither the `
    + `Pythagorean matrix nor the lesser-compatibility array.`;
}

/** The closing line, keyed to the tier and the connection being read. */
export function closingLine(ev, business) {
  if (ev.tier === 0) return `Expect to compromise a great deal.`;
  if (business) {
    return `Read as a business connection — minimal compromise, and the `
      + `disclosure ties the Jupiter offset to good financial footing.`;
  }
  return `Read as a friendship or love connection, on the Venus offset of two.`;
}

function joinList(items) {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
