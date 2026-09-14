import React, { useState } from "react";
import Card from "../components/Card.jsx";
import Bowtie from "../components/Bowtie.jsx";
import Spread, { SpreadLegend } from "../components/Spread.jsx";
import { cardsParagraph, lifePathParagraph, closingLine } from "../lib/copy.js";

/**
 * Why these two are a strong couple: the specific cards that met, whether the
 * match runs both ways, and the Life Path relationship. The headline is the
 * disclosure's own verdict wording, taken straight from the ranking so a row
 * and the reading it opens can never disagree.
 */
export default function MatchReading({
  me, match, business, unlocked, onConnect, onSayHello, onBack,
  backLabel = "Matches",
}) {
  const [which, setWhich] = useState("spiritual");
  const them = match.profile;
  const hit = new Set(match.hits);

  return (
    <div className="ks flat">
      <button className="back" onClick={onBack}>‹ {backLabel}</button>

      <div className="emblem">
        <Bowtie bowtie={them.bowtie} size="lg" label={`${them.name}'s bowtie`} />
        <p className="emblem-cap">{them.bowtie.caption}</p>
      </div>

      <div className="pair">
        <figure>
          <Card name={me.birthCard} size="lg" />
          <figcaption><b>You</b>{me.birthCard}</figcaption>
        </figure>
        <span className="vs" aria-hidden="true">&</span>
        <figure>
          <Card name={them.fc.birthCard} size="lg" />
          <figcaption><b>{them.name}</b>{them.fc.birthCard}</figcaption>
        </figure>
      </div>

      <button className={unlocked ? "ks-go" : "ks-ghost"} onClick={onSayHello}
        style={{ marginBottom: 18 }}>
        Say hello
      </button>

      {unlocked
        ? <Unlocked me={me} match={match} them={them} business={business}
            which={which} setWhich={setWhich} hit={hit} />
        : <Locked them={them} onConnect={onConnect} />}
    </div>
  );
}

function Locked({ them, onConnect }) {
  return (
    <>
      <p className="ks-note" style={{ textAlign: "center" }}>{them.bio}</p>
      <div className="callout" style={{ marginBottom: 16 }}>
        The reading between you two is calculated and waiting. In this version
        it opens once you both connect.
      </div>
      <button className="ks-go" onClick={onConnect}>
        Connect to read the cards
      </button>
    </>
  );
}

function Unlocked({ me, match, them, business, which, setWhich, hit }) {
  return (
    <>
      <div className={`verdict t${match.tier}`}>
        <h3>{capitalise(match.headline)}</h3>
        <p>{cardsParagraph(match, me, them.fc)}</p>
        <p>{lifePathParagraph(match, me, them.fc)}</p>
        <p>{closingLine(match, business)}</p>
      </div>

      {match.hits.length > 0 && (
        <>
          <hr className="ks-rule" />
          <h2 className="ks-h">The cards that met</h2>
          <p className="ks-note">
            {match.hits.length === 1 ? "One card" : `${match.hits.length} cards`} sit
            in one reading as a birth or ruling card and in the other as a
            kindred spirit.
          </p>
          <div className="chips">
            {match.hits.map((c) => <Card key={c} name={c} hit />)}
          </div>
        </>
      )}

      <hr className="ks-rule" />
      <h2 className="ks-h">Where you both sit</h2>
      <div className="ks-seg" role="group" aria-label="Which spread">
        <button aria-pressed={which === "spiritual"} onClick={() => setWhich("spiritual")}>
          <b>Spiritual spread</b>the base deck
        </button>
        <button aria-pressed={which === "life"} onClick={() => setWhich("life")}>
          <b>Life spread</b>the complement
        </button>
      </div>
      <Spread fc={me} which={which} them={them.fc} />
      <SpreadLegend fc={me} them={them.fc} />

      <hr className="ks-rule" />
      <h2 className="ks-h">{them.name}</h2>
      <p className="ks-note">{them.bio}</p>
      <dl className="kv">
        <div><dt>Birth card</dt><dd>{them.fc.birthCard}</dd></div>
        <div><dt>Ruling card</dt><dd>{them.fc.prc.join(" and ") || "—"}</dd></div>
        <div>
          <dt>Sign</dt>
          <dd>{them.fc.signs.join(" / ")}{them.fc.signs.length > 1 ? " (cusp)" : ""}</dd>
        </div>
        <div><dt>Life path</dt><dd>{them.fc.lifePath}</dd></div>
        <div><dt>Age</dt><dd>{them.age}</dd></div>
      </dl>
    </>
  );
}

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);
