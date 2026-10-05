import React, { useEffect, useState } from "react";
import {
  DEMO, currentMember, isRecovering, missingConfig, onMemberChange, supabase,
} from "../lib/supabase.js";
import Welcome from "../screens/Welcome.jsx";
import SignIn from "../screens/SignIn.jsx";
import ResetPassword from "../screens/ResetPassword.jsx";

/**
 * Nothing gets past this without a signed-in member, except in demo mode,
 * where there are no accounts at all. Renders children(memberId), with a null
 * member in demo mode.
 *
 * The order matters. Demo mode is a deliberate choice and comes first. A build
 * that is simply missing its variables is not demo mode and must never be
 * mistaken for it, so it stops here and names what is absent — the app, and
 * therefore the fixture profiles, are never reached. Recovery comes before the
 * sign-in form: a member who arrived on a reset link is already signed in, but
 * sees only the form that sets a new password.
 */
export default function AuthGate({ children }) {
  const [member, setMember] = useState(currentMember);
  // null until a visitor says which they want, so a first-time visitor is
  // never shown a sign-in form for an account they do not have.
  const [choice, setChoice] = useState(null);     // null | "up" | "in"

  useEffect(() => {
    const off = onMemberChange((next) => {
      setMember(next);
      // Signing out returns to the welcome screen rather than to a form.
      if (!next.id) setChoice(null);
    });
    setMember(currentMember());      // in case it changed before this subscribed
    return off;
  }, []);

  if (DEMO) return children(null);
  if (missingConfig.length || !supabase) return <NotConfigured missing={missingConfig} />;
  if (!member.ready) return <div className="ks flat" aria-busy="true" />;
  if (isRecovering()) return <ResetPassword />;

  if (!member.id) {
    return choice
      ? <SignIn initialMode={choice} onBack={() => setChoice(null)} />
      : <Welcome onCreate={() => setChoice("up")} onSignIn={() => setChoice("in")} />;
  }

  return children(member.id);
}

/**
 * The dead end for a misconfigured build. It deliberately offers nothing to
 * click: there is no feed to fall back to and no account to make, and saying so
 * plainly is more use than a half-working app.
 */
function NotConfigured({ missing = [] }) {
  return (
    <div className="ks flat">
      <h1 className="ks-mark">Kindred Spirits</h1>
      <p className="ks-sub">This app is not configured.</p>

      <div className="callout" style={{ marginBottom: 16 }}>
        {missing.length > 0 ? (
          <>
            <b>
              {missing.length > 1 ? "These variables are" : "This variable is"} missing
              from this build:
            </b>
            <ul style={{ margin: "9px 0 0", paddingLeft: 20 }}>
              {missing.map((name) => <li key={name}><code>{name}</code></li>)}
            </ul>
          </>
        ) : (
          <b>The Supabase client could not be created.</b>
        )}
      </div>

      <p className="ks-note">
        This is <b>not</b> the demo build. Nothing is shown here on purpose —
        without a backend there are no members to read, and the seeded profiles
        are only ever used when demo mode is asked for by name.
      </p>
      <p className="ks-note">
        Set the variables as in <code>.env.example</code> and build again. On
        Vercel they have to be set for both Production and Preview, and a change
        to them needs a redeploy with the build cache turned off. To run the
        seeded review build instead, set <code>VITE_DEMO_MODE=true</code>.
      </p>
    </div>
  );
}
