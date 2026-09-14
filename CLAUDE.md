# Working in this repo

Read `docs/ALGORITHM.md` and `docs/DESIGN.md` before touching anything. They
carry context that took real effort to recover and is not obvious from the
code.

## The engine is load-bearing

`engine/kindredEngine.js` is the reading engine. `engine/kindred_spirits.py` is
the reference implementation the JS is checked against. They must stay in
agreement.

Rules:

- **Never change a number in the engine to make a UI problem go away.** The
  card tables, offsets and rounding were validated against the disclosure's own
  Appendix B chart. If a reading looks wrong, the UI is wrong first.
- Run `npm test` after any change that touches `engine/`. All 10 tests must
  pass. If you change the Python reference, regenerate the parity fixture.
- Every data table in the engine carries a provenance tag (`[DOC]`, `[FIG]`,
  `[DERIVED]`, `[ASSUMED]`). Preserve them. Add one if you add a table.
- The engine imports nothing. Keep it that way — it is meant to move to React
  Native untouched.

## Scope

This is a prototype for a single client review, not production. Prefer working
screens over infrastructure. No auth, no database, no backend calls. Seeded
fixture profiles only.

Do not add a state management library, a component library, or a test framework
beyond `node:test`. If a dependency feels necessary, say why before adding it.

## Confidentiality

This implements a confidential third-party patent disclosure. Keep the repo
private. Do not publish the algorithm, the derivations, or the card tables
anywhere public, and add `noindex` to any deployed build.

## Style

Match the existing prototype: plain CSS in a `<style>` block with custom
properties, no utility-class framework. Sentence case, no ALL-CAPS labels.
Copy should sound like the disclosure's own Output Examples — "a natural fit",
"marginally compatible" — not like generic app copy.

Keep commits small and describe what changed and why.
