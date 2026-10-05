import React, { useState } from "react";
import { requestPasswordReset, supabase } from "../lib/supabase.js";

/**
 * Email and password, and nothing else. Onboarding still asks for the fields
 * the reading needs once you are in.
 *
 * Three modes: signing in, creating an account, and asking for a reset link.
 * The reset reply is deliberately the same whether or not the address has an
 * account, so this screen cannot be used to find out who is a member.
 */
export default function SignIn() {
  const [mode, setMode] = useState("in");        // "in" | "up" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [note, setNote] = useState(null);

  const creating = mode === "up";
  const forgot = mode === "forgot";

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const ready = forgot
    ? emailOk
    : emailOk && password.length >= (creating ? 8 : 1);

  const switchTo = (next) => { setMode(next); setProblem(null); setNote(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setProblem(null);
    setNote(null);

    if (forgot) {
      try {
        await requestPasswordReset(email);
        setNote("If that address has an account, a reset link is on its way to it.");
        setMode("in");
      } catch (err) {
        setProblem(err.message);
      }
      setBusy(false);
      return;
    }

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
        {forgot
          ? "Give us the address on your account and we will email a link that lets you set a new password."
          : creating
            ? "Make an account, then give us your birthdate. The cards do the rest."
            : "Sign in to see who your cards put you near."}
      </p>

      {!forgot && (
        <div className="ks-seg" role="group" aria-label="Account">
          <button type="button" aria-pressed={!creating} onClick={() => switchTo("in")}>
            <b>Sign in</b>you have an account
          </button>
          <button type="button" aria-pressed={creating} onClick={() => switchTo("up")}>
            <b>Create an account</b>first time here
          </button>
        </div>
      )}

      <form onSubmit={submit}>
        <label className="ks-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" inputMode="email" />
        </label>
        {!forgot && (
          <label className="ks-field">
            <span>
              Password
              {creating && <em className="count">at least 8 characters</em>}
            </span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={creating ? "new-password" : "current-password"} />
          </label>
        )}
        <button className="ks-go" type="submit" disabled={!ready || busy}>
          {busy ? "One moment…" : forgot ? "Email me a link" : creating ? "Create my account" : "Sign in"}
        </button>
      </form>

      {problem && <p className="problem" role="alert">{problem}</p>}
      {note && <p className="ks-note" role="status" style={{ marginTop: 14 }}>{note}</p>}

      {mode === "in" && (
        <button type="button" className="linkish" onClick={() => switchTo("forgot")}>
          I have forgotten my password
        </button>
      )}
      {forgot && (
        <button type="button" className="linkish" onClick={() => switchTo("in")}>
          Back to signing in
        </button>
      )}
    </div>
  );
}
