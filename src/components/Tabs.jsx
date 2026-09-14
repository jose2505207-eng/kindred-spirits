import React from "react";

/**
 * Two tabs, Matches first. docs/DESIGN.md: Matches is the landing surface and
 * the user is never routed through their own reading to reach people.
 */
export default function Tabs({ tab, setTab }) {
  return (
    <nav className="tabs" role="tablist" aria-label="Sections">
      <div>
        <button role="tab" aria-selected={tab === "matches"}
          onClick={() => setTab("matches")}>
          <i aria-hidden="true">♠</i>Matches
        </button>
        <button role="tab" aria-selected={tab === "you"}
          onClick={() => setTab("you")}>
          <i aria-hidden="true">♥</i>About you
        </button>
      </div>
    </nav>
  );
}
