import React, { useState } from "react";
import Card from "../components/Card.jsx";
import Bowtie from "../components/Bowtie.jsx";
import Spread, { SpreadLegend } from "../components/Spread.jsx";
import BookReading from "./BookReading.jsx";
import { PhotoManager } from "../components/Photos.jsx";
import { JOKER } from "../../engine/kindredEngine.js";
import { GENDERS, SEEKING, genderLabel } from "../lib/gender.js";

/**
 * The user's own full reading. Opt-in, never forced: nothing routes here, the
 * second tab is the only way in.
 */
export default function AboutYou({
  fc, name, business, bowtie, onEditBowtie, memberId = null, onSignOut,
  onDeleteAccount, onModerate,
  gender, interestedIn = [], onSaveInterest,
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

      {onSaveInterest && (
        <>
          <Interest gender={gender} interestedIn={interestedIn} onSave={onSaveInterest} />
          <hr className="ks-rule" />
        </>
      )}

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

      {onModerate && (
        <>
          <hr className="ks-rule" />
          <h2 className="ks-h">Moderation</h2>
          <p className="ks-note">
            You are a moderator, so you can read what members have reported and
            suspend an account.
          </p>
          <button className="ks-ghost" onClick={onModerate}>Open moderation</button>
        </>
      )}

      {onSignOut && (
        <>
          <hr className="ks-rule" />
          <button className="ks-ghost" onClick={onSignOut}>Sign out</button>
        </>
      )}

      {onDeleteAccount && <DeleteAccount onDelete={onDeleteAccount} />}
    </div>
  );
}

/**
 * Gender, and who you are interested in. Changing either changes who is a
 * candidate at all: public_profiles drops anyone the two of you are not
 * mutually interested in before the engine ever sees them.
 */
function Interest({ gender, interestedIn, onSave }) {
  const [editing, setEditing] = useState(false);
  const [g, setG] = useState(gender);
  const [want, setWant] = useState(interestedIn);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const toggle = (id) => setWant((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const start = () => { setG(gender); setWant(interestedIn); setProblem(null); setEditing(true); };

  const save = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await onSave({ gender: g, interestedIn: want });
      setEditing(false);
    } catch (e) {
      setProblem(e.message);
    }
    setBusy(false);
  };

  const looking = interestedIn.length === 0
    ? "everyone"
    : interestedIn.map((id) => genderLabel(id).toLowerCase()).join(" and ");

  if (!editing) {
    return (
      <>
        <h2 className="ks-h">You, and who you are looking for</h2>
        <p className="ks-note">
          {genderLabel(gender)}, interested in {looking}.
        </p>
        <button className="ks-ghost" onClick={start}>Change this</button>
        {problem && <p className="problem" role="alert">{problem}</p>}
      </>
    );
  }

  return (
    <>
      <h2 className="ks-h">You, and who you are looking for</h2>

      <div className="ks-field">
        <span>You are</span>
        <div className="choices" role="group" aria-label="Your gender">
          {GENDERS.map((o) => (
            <button key={o.id} type="button" aria-pressed={g === o.id}
              onClick={() => setG(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ks-field">
        <span>You are interested in<em className="count">choose any</em></span>
        <div className="choices" role="group" aria-label="Who you are interested in">
          {SEEKING.map((o) => (
            <button key={o.id} type="button" aria-pressed={want.includes(o.id)}
              onClick={() => toggle(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
        <p className="ks-note" style={{ margin: 0 }}>
          Choose none to see everyone.
        </p>
      </div>

      <div className="actions">
        <button className="ks-ghost" disabled={busy} onClick={() => setEditing(false)}>
          Cancel
        </button>
        <button className="ks-go" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      {problem && <p className="problem" role="alert">{problem}</p>}
    </>
  );
}

/**
 * Deleting the account. Two steps on purpose: the first press only says what
 * will happen. The Edge Function empties Storage before it removes the
 * account, so nothing is left behind to tidy up.
 */
function DeleteAccount({ onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const run = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await onDelete();
    } catch (e) {
      setProblem(e.message);
      setBusy(false);
    }
  };

  return (
    <>
      <hr className="ks-rule" />
      {confirming ? (
        <>
          <h2 className="ks-h">Delete your account</h2>
          <p className="ks-note">
            Your profile, your photos, your connections and every conversation
            you are in go immediately, and cannot be brought back. If somebody
            has reported you, the report is kept without anything that
            identifies you.
          </p>
          <div className="actions">
            <button className="ks-ghost" disabled={busy}
              onClick={() => { setConfirming(false); setProblem(null); }}>
              Keep my account
            </button>
            <button className="ks-go" disabled={busy} onClick={run}>
              {busy ? "Deleting…" : "Delete for good"}
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="linkish danger"
          onClick={() => setConfirming(true)}>
          Delete account
        </button>
      )}
      {problem && <p className="problem" role="alert">{problem}</p>}
    </>
  );
}
