import React, { useState } from "react";
import {
  requestPasswordReset, resendConfirmation, signIn, signUp,
} from "../lib/supabase.js";

/**
 * Making an account, signing in, and asking for a reset link.
 *
 * Welcome decides which of the first two a visitor lands on, so this opens on
 * whichever they chose rather than defaulting to a sign-in form a new visitor
 * cannot use. Four states:
 *
 *   "up"      email, password, confirm password
 *   "sent"    the account exists and is waiting on a confirmation email
 *   "in"      email and password, with "I have forgotten my password"
 *   "forgot"  email only
 *
 * The reset reply is deliberately the same whether or not the address has an
 * account, so this screen cannot be used to find out who is a member.
 */
export default function SignIn({ initialMode = "in", onBack }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [note, setNote] = useState(null);

  const creating = mode === "up";
  const forgot = mode === "forgot";
  const sent = mode === "sent";

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const longEnough = password.length >= 8;
  const matching = password.length > 0 && password === confirm;

  const ready = creating
    ? emailOk && longEnough && matching
    : forgot
      ? emailOk
      : emailOk && password.length >= 1;

  const switchTo = (next) => {
    setMode(next);
    setProblem(null);
    setNote(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setProblem(null);
    setNote(null);

    try {
      if (forgot) {
        await requestPasswordReset(email);
        setNote("If that address has an account, a reset link is on its way to it.");
        setMode("in");
      } else if (creating) {
        const needsConfirming = await signUp(email, password);
        if (needsConfirming) setMode("sent");
        // If the project ever stops asking for confirmation, the session
        // arrives on its own and AuthGate moves on without this screen.
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setProblem(err.message);
    }
    setBusy(false);
  };

  const resend = async () => {
    setBusy(true);
    setProblem(null);
    setNote(null);
    try {
      await resendConfirmation(email);
      setNote("Sent again. It can take a minute to arrive.");
    } catch (err) {
      setProblem(err.message);
    }
    setBusy(false);
  };

  // ---------- waiting on the confirmation email ----------

  if (sent) {
    return (
      <div className="ks flat">
        <h1 className="ks-mark">Check your inbox</h1>
        <p className="ks-sub">
          We have emailed a confirmation link to <b>{email.trim()}</b>. Open it
          and you will come straight back here, signed in.
        </p>

        <div className="callout" style={{ marginBottom: 18 }}>
          Nothing yet? It can take a minute, and it sometimes lands in spam.
          The link works once and lasts an hour.
        </div>

        <div className="stacked">
          <button className="ks-ghost" disabled={busy} onClick={resend}>
            {busy ? "Sending…" : "Send the email again"}
          </button>
          <button className="ks-ghost" disabled={busy} onClick={() => switchTo("in")}>
            I have confirmed — let me sign in
          </button>
        </div>

        {problem && <p className="problem" role="alert">{problem}</p>}
        {note && <p className="ks-note" role="status">{note}</p>}
      </div>
    );
  }

  // ---------- the forms ----------

  return (
    <div className="ks flat">
      {onBack && (
        <button className="back" onClick={onBack}>‹ Back</button>
      )}

      <h1 className="ks-mark">
        {creating ? "Create an account" : forgot ? "Reset your password" : "Sign in"}
      </h1>
      <p className="ks-sub">
        {creating
          ? "An email address and a password. The cards come next."
          : forgot
            ? "Give us the address on your account and we will email a link that lets you set a new password."
            : "Sign in to see who your cards put you near."}
      </p>

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
            <input type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={creating ? "new-password" : "current-password"} />
          </label>
        )}

        {creating && (
          <label className="ks-field">
            <span>And again</span>
            <input type="password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password" />
          </label>
        )}

        <button className="ks-go" type="submit" disabled={!ready || busy}>
          {busy
            ? "One moment…"
            : creating ? "Create my account" : forgot ? "Email me a link" : "Sign in"}
        </button>
      </form>

      {creating && password.length > 0 && !longEnough && (
        <p className="ks-note" style={{ marginTop: 12 }}>
          A password needs at least eight characters.
        </p>
      )}
      {creating && confirm.length > 0 && !matching && (
        <p className="problem" role="alert">Those two do not match.</p>
      )}
      {problem && <p className="problem" role="alert">{problem}</p>}
      {note && <p className="ks-note" role="status" style={{ marginTop: 14 }}>{note}</p>}

      {mode === "in" && (
        <>
          <button type="button" className="linkish" onClick={() => switchTo("forgot")}>
            I have forgotten my password
          </button>
          <button type="button" className="linkish" onClick={() => switchTo("up")}>
            I need to create an account
          </button>
        </>
      )}
      {creating && (
        <button type="button" className="linkish" onClick={() => switchTo("in")}>
          I already have an account
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
