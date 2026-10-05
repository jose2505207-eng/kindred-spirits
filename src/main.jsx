import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./components/AuthGate.jsx";
import { DEMO } from "./lib/supabase.js";
import { CSS } from "./theme.js";

// The demo marker sits outside AuthGate on purpose, so it is on every screen
// the demo build can reach — onboarding and the reveal included — and a seeded
// build can never be mistaken for the real app.
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <style>{CSS}</style>
    {DEMO && <p className="demo-badge" role="status">Demo — no accounts</p>}
    <AuthGate>
      {(memberId) => <App key={memberId ?? "demo"} memberId={memberId} />}
    </AuthGate>
  </React.StrictMode>,
);
