import React, { useState } from "react";
import CardTurn from "../components/CardTurn.jsx";
import { JOKER } from "../../engine/kindredEngine.js";

/**
 * The card-turn moment, then straight on to Matches. Deliberately not a
 * reading: docs/DESIGN.md says the user is never routed through their own
 * reading to reach people.
 */
export default function Reveal({ fc, name, onContinue }) {
  const [done, setDone] = useState(false);
  const joker = fc.birthCard === JOKER;

  return (
    <div className="ks flat">
      <div className="reveal-stage">
        <p className="ks-eyebrow">{name}, your birth card is</p>

        <CardTurn name={fc.birthCard} onDone={() => setDone(true)} />

        {done && (
          <div className="fade-up" style={{ marginTop: 14 }}>
            <h1 className="ks-mark" style={{ fontSize: 30, marginBottom: 8 }}>
              {joker ? "The Joker" : fc.birthCard}
            </h1>
            <p className="ks-sub" style={{ marginBottom: 22, maxWidth: 330 }}>
              {joker
                ? `December 31 falls outside both spreads, so there is no ruling `
                  + `card and no Kindred Spirits list to read from. Your matches `
                  + `will be thin — we have flagged this one for the authors.`
                : `${fc.signs.join(" and ")} · life path ${fc.lifePath} · `
                  + `ruling card ${fc.prc.join(" and ")}`}
            </p>
            <button className="ks-go" onClick={onContinue}>
              See your matches
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
