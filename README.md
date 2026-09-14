# Kindred Spirits

A dating app that matches people by a card-divination reading of their
birthdates. This repo is a **clickable prototype for client review** — no
accounts, no backend, seeded profiles.

> **Private.** This implements a confidential patent disclosure by Jack R.
> McKeown Sr. and Jack R. McKeown Jr. Keep the repo and any deployment private.

## Layout

```
engine/
  kindredEngine.js       the reading engine — pure functions, no framework
  kindred_spirits.py     Python reference implementation
  engine.test.mjs        10 tests: chart fixture, worked examples, JS↔Py parity
  fixtures/
    appendix-b.json      70 rows transcribed from the disclosure's chart
    reference-1990.json  full-year Python output, regression only
app/
  KindredSpirits.prototype.jsx   the single-file prototype the app grows from
docs/
  ALGORITHM.md           provenance, derivations, bugs found, open questions
  DESIGN.md              product flow, ranking rules, design tokens
CLAUDE.md                standing instructions for Claude Code
```

## Run

```sh
npm test              # engine tests (Node 18+, no dependencies)
npm run test:py       # Python reference self-test
```

## State

The engine is done and verified: every reading matches the disclosure's five
worked examples and ~70 dates transcribed from its Appendix B chart, and the JS
and Python implementations agree across all 730 date × connection combinations.

The app is one screen — a reading calculator. Turning it into the dating flow
described in `docs/DESIGN.md` is the next piece of work.

## Read this before changing the engine

`docs/ALGORITHM.md` records four bugs in the source disclosure, one of which
matters urgently: **the Birth Card index must be rounded, not truncated.** A
Swift `Int()` cast written straight from the disclosure produces the wrong card
for a large share of the year. If the client has an existing backend, check
that first.
