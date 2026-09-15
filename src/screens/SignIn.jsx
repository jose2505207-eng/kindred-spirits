import React, { useState } from "react";
import { supabase } from "../lib/supabase.js";

/**
 * Email and password, and nothing else. Onboarding still asks for the three
 * fields the reading needs once you are in.
 */
export default function SignIn() {
  const [mode, setMode] = useState("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [note, setNote] = useState(null);

  const creating = mode === "up";
  const ready = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= (creating ? 8 : 1);

  const switchTo = (next) => { setMode(next); setProblem(null); setNote(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setProblem(null);
    setNote(null);
    const credentials = { email: email.trim(), password };
    const { data, error } = creating
      ? await supabase.auth.signUp(credentials)
      : await supabase.auth.signInWithPassword(credentials);
    setBusy(false);
    if (error) setProblem(error.message);
    else if (creating && !data.session) {
      setNote("Check your inbox for a confirmation link, then sign in here.");
      setMode("in");
    }
  };

  return (
    <div className="ks flat">
      <h1 className="ks-mark">Kindred Spirits</h1>
      <p className="ks-sub">
        {creating
          ? "Make an account, then give us your birthdate. The cards do the rest."
          : "Sign in to see who your cards put you near."}
      </p>

      <div className="ks-seg" role="group" aria-label="Account">
        <button type="button" aria-pressed={!creating} onClick={() => switchTo("in")}>
          <b>Sign in</b>you have an account
        </button>
        <button type="button" aria-pressed={creating} onClick={() => switchTo("up")}>
          <b>Create an account</b>first time here
        </button>
      </div>

      <form onSubmit={submit}>
        <label className="ks-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" inputMode="email" />
        </label>
        <label className="ks-field">
          <span>
            Password
            {creating && <em className="count">at least 8 characters</em>}
          </span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={creating ? "new-password" : "current-password"} />
        </label>
        <button className="ks-go" type="submit" disabled={!ready || busy}>
          {busy ? "One moment…" : creating ? "Create my account" : "Sign in"}
        </button>
      </form>

      {problem && <p className="problem" role="alert">{problem}</p>}
      {note && <p className="ks-note" role="status" style={{ marginTop: 14 }}>{note}</p>}
    </div>
  );
}
