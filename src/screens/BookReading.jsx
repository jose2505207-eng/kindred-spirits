import React, { useState } from "react";

/**
 * The astrologer entry point. It appears at the foot of About you and nowhere
 * else — docs/DESIGN.md keeps it out of the matches flow entirely.
 *
 * Out of scope for the prototype: the booking itself. The form submits
 * nowhere and stores nothing.
 */
export default function BookReading({ name }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: name || "", email: "", focus: "" });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (sent) {
    return (
      <div className="book">
        <h2>Request noted</h2>
        <p className="ok">
          An astrologer would pick this up and come back to you. Nothing was
          actually sent — this is a prototype.
        </p>
      </div>
    );
  }

  return (
    <div className="book">
      <h2>Go deeper with an astrologer</h2>
      <p>
        A person, not the algorithm. Forty minutes on your spread, your ruling
        card and what the diagonals are doing this year.
      </p>

      {!open ? (
        <button className="ks-ghost" onClick={() => setOpen(true)}>
          Book a deeper reading
        </button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          <label className="ks-field">
            <span>Name</span>
            <input value={form.name} onChange={set("name")} />
          </label>
          <label className="ks-field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={set("email")}
              autoComplete="email" />
          </label>
          <label className="ks-field">
            <span>What would you like to look at?</span>
            <textarea value={form.focus} onChange={set("focus")} />
          </label>
          <button className="ks-go" type="submit"
            disabled={!form.name.trim() || !form.email.trim()}>
            Request a reading
          </button>
        </form>
      )}
    </div>
  );
}
