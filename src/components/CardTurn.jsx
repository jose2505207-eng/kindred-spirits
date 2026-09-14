import React, { useEffect, useState } from "react";
import Card, { CardBack } from "./Card.jsx";

const reducedMotion = () =>
  typeof window !== "undefined"
  && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * The single orchestrated moment in the app: the card turning face up.
 * docs/DESIGN.md asks for exactly one, so nothing else animates on entry.
 * Under prefers-reduced-motion the card simply starts face up.
 */
export default function CardTurn({ name, onDone }) {
  const skip = reducedMotion();
  const [turned, setTurned] = useState(skip);

  useEffect(() => {
    if (skip) { onDone?.(); return; }
    const turn = setTimeout(() => setTurned(true), 420);
    const done = setTimeout(() => onDone?.(), 420 + 850);
    return () => { clearTimeout(turn); clearTimeout(done); };
  }, [skip, onDone]);

  return (
    <div className="turn-wrap flip">
      <div className={`turnable${turned ? " turned" : ""}`}>
        <CardBack size="xl" />
        <div className="face"><Card name={name} size="xl" /></div>
      </div>
    </div>
  );
}
