import React, { useState } from "react";
import { DEMO } from "../lib/supabase.js";

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Name, birthdate, and the connection being read. Three fields and nothing
 * else — this is the only thing standing between opening the app and seeing
 * people.
 */
export default function Onboarding({ onSubmit }) {
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [business, setBusiness] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const parsed = parseDate(birthdate);
  const ready = name.trim().length > 0 && parsed !== null;

  return (
    <div className="ks flat">
      <h1 className="ks-mark">Kindred Spirits</h1>
      <p className="ks-sub">
        Your birthdate maps to one card in a 52-card spread. The cards sitting on
        its diagonals are the people you are drawn to.
      </p>

      <form onSubmit={async (e) => {
        e.preventDefault();
        if (!ready || busy) return;
        setBusy(true);
        setProblem(null);
        try {
          await onSubmit({ name: name.trim(), birthdate, business });
        } catch (err) {
          setProblem(err.message);
          setBusy(false);
        }
      }}>
        <label className="ks-field">
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)}
            autoComplete="given-name" placeholder="" />
        </label>

        <label className="ks-field">
          <span>Your birthdate</span>
          <input type="date" value={birthdate} max={TODAY} min="1920-01-01"
            onChange={(e) => setBirthdate(e.target.value)} />
        </label>

        <div className="ks-seg" role="group" aria-label="What you are looking for">
          <button type="button" aria-pressed={!business} onClick={() => setBusiness(false)}>
            <b>Love</b>Venus offset of two
          </button>
          <button type="button" aria-pressed={business} onClick={() => setBusiness(true)}>
            <b>Business</b>Jupiter offset of four
          </button>
        </div>

        <button className="ks-go" type="submit" disabled={!ready || busy}>
          Turn my card
        </button>
      </form>
      {problem && <p className="problem" role="alert">{problem}</p>}

      <p className="ks-note" style={{ marginTop: 18 }}>
        {DEMO
          ? "Nothing is stored and nothing is sent anywhere. This is a prototype running entirely on your phone."
          : "Your name and birthdate are saved to your profile. Members who can see you can see your birthdate too, because it is what the cards are read from."}
      </p>
    </div>
  );
}

export function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  const probe = new Date(y, m - 1, d);
  if (probe.getMonth() !== m - 1 || probe.getDate() !== d) return null;
  return [m, d, y];
}
