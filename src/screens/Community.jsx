import React from "react";
import Bowtie from "../components/Bowtie.jsx";

/**
 * The community wall: everyone's bowtie, yours first. Unranked on purpose and
 * nothing on it gives a reading away, so it works in either feed mode.
 */
export default function Community({ name, bowtie, people, onEdit, onOpen }) {
  return (
    <div className="ks">
      <h1 className="ks-mark">Bowties</h1>
      <p className="ks-sub">
        Everyone's emblem, in place of a photo — {people.length + 1} of you.
        Tap one to see how your cards meet.
      </p>

      <ul className="wall">
        <li>
          <div className="tile mine">
            <Bowtie bowtie={bowtie} size="md" label="Your bowtie" />
            <b>{name}<em>you</em></b>
            <p>{bowtie.caption || "No caption yet."}</p>
            <button className="ks-ghost" onClick={onEdit}>Edit yours</button>
          </div>
        </li>
        {people.map((p) => (
          <li key={p.id}>
            <button className="tile" onClick={() => onOpen(p.id)}>
              <Bowtie bowtie={p.bowtie} size="md" />
              <b>{p.name}</b>
              <p>{p.bowtie.caption}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
