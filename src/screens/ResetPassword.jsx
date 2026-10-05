import React, { useState } from "react";
import { setNewPassword, signOut } from "../lib/supabase.js";

/**
 * Setting a new password from a recovery link.
 *
 * The link has already signed this person in — that is how Supabase recovery
 * works — which is exactly why AuthGate shows nothing but this form until a
 * password has been chosen. An abandoned recovery link sitting in an inbox
 * would otherwise be a way into the account.
 */
export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const longEnough = password.length >= 8;
  const matching = password.length > 0 && password === again;
  const ready = longEnough && matching;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await setNewPassword(password);
      // Nothing more to do here: AuthGate stops showing this form and the app
      // opens on the member who has just been recovered.
    } catch (err) {
      setProblem(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="ks flat">
      <h1 className="ks-mark">Kindred Spirits</h1>
      <p className="ks-sub">
        Choose a new password. You are signed in from the link in your email,
        so this is the last step.
      </p>

      <form onSubmit={submit}>
        <label className="ks-field">
          <span>
            New password
            <em className="count">at least 8 characters</em>
          </span>
          <input type="password" value={password} autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="ks-field">
          <span>And again</span>
          <input type="password" value={again} autoComplete="new-password"
            onChange={(e) => setAgain(e.target.value)} />
        </label>
        <button className="ks-go" type="submit" disabled={!ready || busy}>
          {busy ? "One moment…" : "Set my password"}
        </button>
      </form>

      {password.length > 0 && !longEnough && (
        <p className="ks-note" style={{ marginTop: 12 }}>
          A password needs at least eight characters.
        </p>
      )}
      {again.length > 0 && !matching && (
        <p className="problem" role="alert">Those two do not match.</p>
      )}
      {problem && <p className="problem" role="alert">{problem}</p>}

      <button type="button" className="linkish" onClick={signOut}>
        Cancel, and sign out
      </button>
    </div>
  );
}
