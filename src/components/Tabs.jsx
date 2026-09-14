import React from "react";

// The glyphs are tab icons, not cards.
const TABS = [
  ["matches", "♠", "Matches"],
  ["messages", "♦", "Messages"],
  ["bowties", "♣", "Bowties"],
  ["you", "♥", "About you"],
];

export const TAB_LABEL = Object.fromEntries(TABS.map(([id, , label]) => [id, label]));

/**
 * Matches first. docs/DESIGN.md: Matches is the landing surface and the user
 * is never routed through their own reading to reach people.
 */
export default function Tabs({ tab, setTab }) {
  return (
    <nav className="tabs" role="tablist" aria-label="Sections">
      <div>
        {TABS.map(([id, glyph, label]) => (
          <button key={id} role="tab" aria-selected={tab === id}
            onClick={() => setTab(id)}>
            <i aria-hidden="true">{glyph}</i>{label}
          </button>
        ))}
      </div>
    </nav>
  );
}
