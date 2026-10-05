import React from "react";

/**
 * What a visitor with no session sees first.
 *
 * Creating an account is the default and carries the weight. The screen this
 * replaces opened on a sign-in form with "Create an account" as an
 * equal-looking tab beside it, which asks a first-time visitor to sign in to
 * something they have no account for.
 */
export default function Welcome({ onCreate, onSignIn }) {
  return (
    <div className="ks flat">
      <h1 className="ks-mark">Kindred Spirits</h1>
      <p className="ks-sub">
        Compatibility read from two birthdates rather than from photographs.
        Your birthdate maps to one card in a 52-card spread, and the cards
        sitting on its diagonals are the people you are drawn to.
      </p>

      <div className="stacked">
        <button className="ks-go" onClick={onCreate}>Create an account</button>
        <button className="ks-ghost" onClick={onSignIn}>
          I already have an account
        </button>
      </div>

      <p className="ks-note">
        You will need an email address you can open, your birthdate, and to be
        18 or over.
      </p>
    </div>
  );
}
