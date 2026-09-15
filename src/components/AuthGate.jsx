import React, { useEffect, useState } from "react";
import { DEMO, currentMember, onMemberChange, supabase } from "../lib/supabase.js";
import SignIn from "../screens/SignIn.jsx";

/**
 * Nothing gets past this without a signed-in member, except in demo mode,
 * where there are no accounts at all. Renders children(memberId), with a null
 * member in demo mode.
 */
export default function AuthGate({ children }) {
  const [member, setMember] = useState(currentMember);

  useEffect(() => {
    const off = onMemberChange(setMember);
    setMember(currentMember());      // in case it changed before this subscribed
    return off;
  }, []);

  if (DEMO) return children(null);
  if (!supabase) return <NotConfigured />;
  if (!member.ready) return <div className="ks flat" aria-busy="true" />;
  if (!member.id) return <SignIn />;
  return children(member.id);
}

function NotConfigured() {
  return (
    <div className="ks flat">
      <h1 className="ks-mark">Kindred Spirits</h1>
      <div className="callout">
        <b>This build has no backend configured.</b> Set VITE_SUPABASE_URL and
        VITE_SUPABASE_PUBLISHABLE_KEY as in .env.example, or set
        VITE_DEMO_MODE=true for the seeded review build.
      </div>
    </div>
  );
}
