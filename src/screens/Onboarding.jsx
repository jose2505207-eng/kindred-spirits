import React, { useState } from "react";
import { DEMO } from "../lib/supabase.js";
import { ageOn } from "../lib/reading.js";
import { DEFAULT_GENDER, GENDERS, SEEKING } from "../lib/gender.js";

/**
 * 18+. The age-gate trigger in supabase/migrations refuses a younger birthdate
 * whatever a client sends; this mirrors it so the form can say so before the
 * server has to.
 */
export const MIN_AGE = 18;

// The latest birthdate that is still 18 today, so the picker cannot offer a
// date the database will refuse.
const ADULT_MAX = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
})();

/**
 * Name, birthdate, and the connection being read. Three fields and nothing
 * else — this is the only thing standing between opening the app and seeing
 * people.
 */
export default function Onboarding({ onSubmit }) {
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [business, setBusiness] = useState(false);
  const [gender, setGender] = useState(DEFAULT_GENDER);
  const [interestedIn, setInterestedIn] = useState([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const toggleInterest = (id) => setInterestedIn((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const parsed = parseDate(birthdate);
  const underage = parsed !== null && ageOn(birthdate) < MIN_AGE;
  const ready = name.trim().length > 0 && parsed !== null && !underage;

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
          await onSubmit({ name: name.trim(), birthdate, business, gender, interestedIn });
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
          <input type="date" value={birthdate} max={ADULT_MAX} min="1920-01-01"
            onChange={(e) => setBirthdate(e.target.value)} />
        </label>
        {underage && (
          <p className="problem" role="alert">
            Kindred Spirits is for people of 18 and over.
          </p>
        )}

        <div className="ks-field">
          <span>You are</span>
          <div className="choices" role="group" aria-label="Your gender">
            {GENDERS.map((g) => (
              <button key={g.id} type="button" aria-pressed={gender === g.id}
                onClick={() => setGender(g.id)}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ks-field">
          <span>You are interested in<em className="count">choose any</em></span>
          <div className="choices" role="group" aria-label="Who you are interested in">
            {SEEKING.map((g) => (
              <button key={g.id} type="button" aria-pressed={interestedIn.includes(g.id)}
                onClick={() => toggleInterest(g.id)}>
                {g.label}
              </button>
            ))}
          </div>
          <p className="ks-note" style={{ margin: 0 }}>
            Choose none to see everyone. You only appear to people you are
            interested in, who are interested in you.
          </p>
        </div>

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
