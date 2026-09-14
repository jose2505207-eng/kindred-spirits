import React from "react";
import Card from "../components/Card.jsx";
import { reasonFor } from "../lib/copy.js";
import { JOKER } from "../../engine/kindredEngine.js";

const GROUPS = [
  [3, "A natural fit"],
  [2, "Strongly compatible"],
  [1, "Marginally compatible"],
  [0, "Challenging"],
];

/**
 * The landing surface.
 *
 * Two feeds, switched by `upfront` — the open question docs/DESIGN.md leaves
 * for the client. Shown upfront, the verdict is the hook: rows are grouped by
 * tier and carry the reason. Held back, the feed cannot leak the reading at
 * all, so the grouping, the tier accents and the reason all go, and the order
 * is the only thing the ranking still contributes.
 */
export default function Matches({
  me, ranked, business, upfront, connected, onOpen,
}) {
  const joker = me.birthCard === JOKER;
  const offsetPhrase = business
    ? "Jupiter offset of four" : "Venus offset of two";

  return (
    <div className="ks">
      <h1 className="ks-mark">Matches</h1>
      <p className="ks-sub">
        {joker
          ? `Read as a ${business ? "business" : "love"} connection.`
          : upfront
            ? `${ranked.length} people, ranked by how their cards meet yours on `
              + `the ${offsetPhrase}.`
            : `${ranked.length} people, in the order your cards put them. `
              + `Connect to read why.`}
      </p>

      {joker && <JokerNotice />}

      {upfront
        ? GROUPS.map(([tier, label]) => {
          const rows = ranked.filter((r) => r.tier === tier);
          if (!rows.length) return null;
          return (
            <section key={tier}>
              <h2 className="groupby">{label} · {rows.length}</h2>
              <ul className="feed">
                {rows.map((r) => (
                  <Row key={r.profile.id} r={r} me={me} reveal
                    onOpen={onOpen} />
                ))}
              </ul>
            </section>
          );
        })
        : (
          <ul className="feed">
            {ranked.map((r) => (
              <Row key={r.profile.id} r={r} me={me}
                reveal={connected.has(r.profile.id)} onOpen={onOpen} />
            ))}
          </ul>
        )}
    </div>
  );
}

function JokerNotice() {
  return (
    <div className="callout" style={{ marginBottom: 20 }}>
      <b>Your birth card is the Joker.</b> December 31 maps to index 0, which
      sits in neither spread, so you have no ruling card and no Kindred Spirits
      list for anyone to match against. Everyone below is ordered on life path
      alone. That is a gap in the disclosure rather than a fault in your
      reading — it is question 4 for the authors in docs/ALGORITHM.md.
    </div>
  );
}

function Row({ r, me, reveal, onOpen }) {
  const p = r.profile;
  return (
    <li>
      <button className={`row${reveal ? ` t${r.tier}` : ""}`}
        onClick={() => onOpen(p.id)}>
        <Card name={p.fc.birthCard} size="sm" />
        <span className="who">
          <span className="nm">
            {reveal && <span className="tierdot" aria-hidden="true" />}
            {p.name} <em>{p.age}</em>
          </span>
          <span className="cardname">{p.fc.birthCard}</span>
          <span className="why">{reveal ? reasonFor(r, me, p.fc) : p.bio}</span>
        </span>
        <span className="chev" aria-hidden="true">›</span>
      </button>
    </li>
  );
}
