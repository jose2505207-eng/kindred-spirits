import React from "react";
import {
  parts, diagonalPositions, DECK_ARRAY,
  SPIRITUAL_DECK, LIFE_DECK, SPIRITUAL_INDEX, LIFE_INDEX, SUIT_GLYPH,
} from "../../engine/kindredEngine.js";

/**
 * The 8x7 spread with the reader's card, its diagonals and the ruling card
 * lit. Carried over from app/KindredSpirits.prototype.jsx — docs/DESIGN.md
 * calls this the most distinctive thing in the design, so it is unchanged
 * apart from an optional second person outlined in red.
 */
export default function Spread({ fc, which, them = null }) {
  const index = which === "life" ? LIFE_INDEX : SPIRITUAL_INDEX;
  const deck = which === "life" ? LIFE_DECK : SPIRITUAL_DECK;

  const selfN = index[fc.birthCard];
  const diag = new Set(diagonalPositions(selfN, fc.offset).map((p) => p.join(",")));
  const prcSet = new Set(fc.prc.map((c) => index[c]));
  const themN = them ? index[them.birthCard] : null;

  return (
    <div className="spread" role="img"
      aria-label={`The ${which === "life" ? "Life" : "Spiritual"} spread, `
        + `with ${fc.birthCard} and its diagonals highlighted`}>
      {DECK_ARRAY.map((row, i) => row.map((v, j) => {
        if (v === -1) return <div key={`${i}-${j}`} className="cell void" />;
        const name = deck[v];
        const p = parts(name);
        let cls = "cell";
        if (v === selfN) cls += " self" + (p.red ? " isred" : "");
        else if (prcSet.has(v)) cls += " prc";
        else if (diag.has(`${i},${j}`)) cls += " diag";
        if (themN && v === themN) cls += " them";
        return (
          <div key={`${i}-${j}`} className={cls} title={name}>
            {p.rank}{SUIT_GLYPH[p.suit]}
          </div>
        );
      }))}
    </div>
  );
}

export function SpreadLegend({ fc, them = null }) {
  return (
    <div className="legend">
      <span><i style={{ background: "var(--ivory)" }} />your card</span>
      <span>
        <i style={{ background: "var(--felt-3)", border: "1px solid var(--brass)" }} />
        {fc.offset === 2 ? "Venus" : "Jupiter"} diagonals
      </span>
      <span>
        <i style={{ background: "#332910", border: "1px solid var(--brass)" }} />
        ruling card
      </span>
      {them && (
        <span><i style={{ boxShadow: "inset 0 0 0 2px var(--red)" }} />their card</span>
      )}
    </div>
  );
}
