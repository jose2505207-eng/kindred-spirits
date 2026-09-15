import React, { useState } from "react";
import Card from "../components/Card.jsx";
import Bowtie from "../components/Bowtie.jsx";
import Spread, { SpreadLegend } from "../components/Spread.jsx";
import BookReading from "./BookReading.jsx";
import { PhotoManager } from "../components/Photos.jsx";
import { JOKER } from "../../engine/kindredEngine.js";

/**
 * The user's own full reading. Opt-in, never forced: nothing routes here, the
 * second tab is the only way in.
 */
export default function AboutYou({
  fc, name, business, bowtie, onEditBowtie, memberId = null, onSignOut,
}) {
  const [which, setWhich] = useState("spiritual");
  const joker = fc.birthCard === JOKER;
  const ruler = fc.rulers.map((r) => r.planet).join(" and ");

  return (
    <div className="ks">
      <h1 className="ks-mark">About you</h1>
      <p className="ks-sub">
        {name}, read as a {business ? "business" : "love"} connection — the{" "}
        {business ? "Jupiter offset of four" : "Venus offset of two"}.
      </p>

      <div className="emblem">
        <Bowtie bowtie={bowtie} size="lg" label="Your bowtie" />
        <p className={`emblem-cap${bowtie.caption ? "" : " empty"}`}>
          {bowtie.caption || "No caption yet."}
        </p>
        <button className="ks-ghost" onClick={onEditBowtie}>Edit your bowtie</button>
      </div>
      <hr className="ks-rule" />

      {memberId && (
        <>
          <PhotoManager memberId={memberId} />
          <hr className="ks-rule" />
        </>
      )}

      <div className="hero">
        <Card name={fc.birthCard} size="lg" />
        <dl>
          <div className="big">{joker ? "The Joker" : fc.birthCard}</div>
          <dt>Ruling card</dt>
          <dd>{fc.prc.join(" · ") || "—"}</dd>
          <dt>Sign</dt>
          <dd>
            {fc.signs.join(" / ")}{fc.signs.length > 1 ? " (cusp)" : ""}
            {ruler ? ` · ${ruler}` : ""}
          </dd>
          <dt>Life path</dt>
          <dd>{fc.lifePath}</dd>
        </dl>
      </div>

      {joker ? (
        <>
          <hr className="ks-rule" />
          <div className="callout">
            <b>December 31 falls outside both spreads.</b> Index 0 has no
            position in the Spiritual or the Life spread, so there is no ruling
            card, no diagonal and no Kindred Spirits list to draw. Your life
            path still reads as {fc.lifePath}. The disclosure never addresses
            this case; it is question 4 for the authors in docs/ALGORITHM.md.
          </div>
        </>
      ) : (
        <>
          <hr className="ks-rule" />
          <h2 className="ks-h">Where you sit in the spread</h2>
          <div className="ks-seg" role="group" aria-label="Which spread">
            <button aria-pressed={which === "spiritual"}
              onClick={() => setWhich("spiritual")}>
              <b>Spiritual spread</b>the base deck
            </button>
            <button aria-pressed={which === "life"}
              onClick={() => setWhich("life")}>
              <b>Life spread</b>the complement
            </button>
          </div>
          <Spread fc={fc} which={which} />
          <SpreadLegend fc={fc} />
          <p className="ks-note">
            Your matches sit {fc.offset} positions away on the diagonal — the{" "}
            {fc.offset === 2
              ? "Venus offset, which the disclosure ties to friendship and love"
              : "Jupiter offset, which the disclosure ties to business"}.
          </p>

          <hr className="ks-rule" />
          <h2 className="ks-h">Kindred spirits · {fc.kindred.length}</h2>
          <p className="ks-note">
            Anyone born on a day that maps to one of these cards is a candidate
            match.
          </p>
          <div className="chips">
            {fc.kindred.map((c) => <Card key={c} name={c} />)}
          </div>
        </>
      )}

      <hr className="ks-rule" />
      <BookReading name={name} />

      {onSignOut && (
        <>
          <hr className="ks-rule" />
          <button className="ks-ghost" onClick={onSignOut}>Sign out</button>
        </>
      )}
    </div>
  );
}
