import React from "react";

const SIZE = { sm: "bowtie-sm", md: "bowtie-md", lg: "bowtie-lg" };

/**
 * A bowtie: the backdrop colour fills both wings and the face sits in the
 * knot. It stands in for a profile photo everywhere a person is shown.
 * Without a `label` it is decorative, for rows that already name the person.
 */
export default function Bowtie({ bowtie, size = "md", label }) {
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <span className={`bowtie ${SIZE[size] || SIZE.md}`}
      style={{ "--tie": bowtie.backdrop }} {...a11y}>
      <svg viewBox="0 0 120 72" focusable="false">
        <path className="wing" d="M60 36 L8 4 Q-1 36 8 68 Z" />
        <path className="wing" d="M60 36 L112 4 Q121 36 112 68 Z" />
        <path className="fold" d="M60 36 L24 22 Q28 36 24 50 Z" />
        <path className="fold" d="M60 36 L96 22 Q92 36 96 50 Z" />
      </svg>
      <span className="knot">
        {bowtie.image
          ? <img src={bowtie.image} alt="" />
          : <span className="face">{bowtie.emoji}</span>}
      </span>
    </span>
  );
}
