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
src/
  App.jsx                onboarding -> reveal -> two tabs
  theme.js               the whole stylesheet, one <style> block
  lib/ranking.js         candidate scoring, calibrated to the Output Examples
  lib/copy.js            reading prose, built from the actual match
  fixtures/profiles.js   35 seeded candidates
  lib/bowtie.js          bowtie shape, backdrops, emoji and image checks
  lib/messaging.js       messaging transport: in-memory stub, swap for a backend
  lib/useMessaging.js    React bindings for the transport
  components/            Card, Spread, CardTurn, Tabs, Bowtie
  screens/               Onboarding, Reveal, Matches, MatchReading,
                         AboutYou, BookReading, Messages, Thread,
                         Community, BowtieEditor
app/
  KindredSpirits.prototype.jsx   the original single-file prototype, kept
                                 for reference — it carries its own inlined
                                 copy of the engine, so do not edit it
docs/
  ALGORITHM.md           provenance, derivations, bugs found, open questions
  DESIGN.md              product flow, ranking rules, design tokens
CLAUDE.md                standing instructions for Claude Code
```

## Run

```sh
npm install
npm run dev           # the prototype, mobile viewport at ~390px
npm run build         # static build in dist/, ready for Vercel
npm test              # engine tests (Node 18+, no dependencies)
npm run test:py       # Python reference self-test
```

The engine tests need no dependencies; only the app does.

## State

The engine is done and verified: every reading matches the disclosure's five
worked examples and ~70 dates transcribed from its Appendix B chart, and the JS
and Python implementations agree across all 730 date × connection combinations.

The dating flow in `docs/DESIGN.md` is built as a clickable prototype:
onboarding with a card turn, a ranked match feed, the match reading, and an
opt-in About you page with the astrologer entry point at its foot. Every
reading comes from `engine/kindredEngine.js`; nothing is reimplemented.

`docs/DESIGN.md` leaves one question open for the client — is the reading the
hook on the feed, or the reward for connecting? Both feeds are built. A pill
above the tab bar switches between them during the review.

Not built, and deliberately: auth, messaging, payments, photos, the booking
itself, and any deployment. `npm run build` produces a static `dist/` that
Vercel serves as-is.

## Read this before changing the engine

`docs/ALGORITHM.md` records four bugs in the source disclosure, one of which
matters urgently: **the Birth Card index must be rounded, not truncated.** A
Swift `Int()` cast written straight from the disclosure produces the wrong card
for a large share of the year. If the client has an existing backend, check
that first.
