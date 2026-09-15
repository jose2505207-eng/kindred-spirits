# Kindred Spirits

A dating app that matches people by a card-divination reading of their
birthdates. The app runs on Supabase — accounts, profiles, photos, connections
and live messages — and a demo mode keeps the original client-review build, on
seeded profiles with no accounts.

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
  main.jsx               AuthGate around App
  App.jsx                onboarding -> reveal -> four tabs
  theme.js               the whole stylesheet, one <style> block
  lib/supabase.js        the client and the signed-in member; VITE_DEMO_MODE
  lib/people.js          profiles, candidates, connections, blocks, bowties
  lib/photos.js          profile photos in Storage
  lib/reading.js         where a profile meets the engine
  lib/ranking.js         candidate scoring, calibrated to the Output Examples
  lib/copy.js            reading prose, built from the actual match
  lib/cardArt.js         card codes and card-face URLs
  fixtures/profiles.js   35 seeded candidates, demo mode only
  lib/bowtie.js          bowtie shape, backdrops, emoji and image checks
  lib/messaging.js       the only file that knows where messages live
  lib/useMessaging.js    React bindings for the transport
  components/            Card, Spread, CardTurn, Tabs, Bowtie, AuthGate, Photos
  screens/               SignIn, Onboarding, Reveal, Matches, MatchReading,
                         AboutYou, BookReading, Messages, Thread,
                         Community, BowtieEditor
supabase/
  migrations/            the schema, RLS and storage, one file per concern
  database.types.ts      generated description of the schema
assets/card-art/         card faces (public domain) and their manifest
scripts/
  verify-cards.mjs       card art checked against the engine (runs in npm test)
  card-contact-sheet.*   every face on one page, for checking by eye
  generate-cards-migration.mjs, import-card-art.mjs, upload-card-art.mjs
  rls-proof.mjs          attacks the live RLS and prints what it refused
app/
  KindredSpirits.prototype.jsx   the original single-file prototype, kept
                                 for reference — it carries its own inlined
                                 copy of the engine, so do not edit it
docs/
  ALGORITHM.md           provenance, derivations, bugs found, open questions
  DESIGN.md              product flow, ranking rules, data model, design tokens
  TESTING.md             the two-member test pass and the RLS proof
CLAUDE.md                standing instructions for Claude Code
```

## Run

```sh
npm install
cp .env.example .env  # then fill in the project URL and publishable key
npm run dev           # the app, mobile viewport at ~390px
VITE_DEMO_MODE=true npm run dev   # the client-review build: seeded, no accounts
npm run build         # static build in dist/, ready for Vercel
npm test              # engine tests, card art checks, cards migration drift
npm run test:py       # Python reference self-test
```

The engine tests need no dependencies; the app needs `@supabase/supabase-js`.
Never put a secret key in a `VITE_` variable — Vite bundles all of them.

## State

The engine is done and verified: every reading matches the disclosure's five
worked examples and ~70 dates transcribed from its Appendix B chart, and the JS
and Python implementations agree across all 730 date × connection combinations.

The dating flow in `docs/DESIGN.md` is built on a real backend: email and
password accounts, onboarding into a stored profile, a feed ranked over real
members, connections and mutual matches, messages that arrive live, photos,
bowties with uploaded faces, and block and report. Every reading and every rank
still comes from `engine/kindredEngine.js`, on the device; the database holds
birthdates and nothing derived from them. `docs/DESIGN.md` has the data model
and the one privacy trade-off still to decide: signed-in members can read each
other's birthdates.

Verified against the live project: a two-member pass in two browsers and
`scripts/rls-proof.mjs`, both recorded in `docs/TESTING.md`. `npm test` also
checks all 53 card faces against the engine.

`VITE_DEMO_MODE=true` keeps the client-review build as it was: seeded profiles,
no accounts, in-memory messages with one reply each.

`docs/DESIGN.md` leaves one question open for the client — is the reading the
hook on the feed, or the reward for connecting? Both feeds are built. A pill
above the tab bar switches between them.

Not built: payments, the booking itself, push notifications, read receipts,
account deletion, and a deployment of the backend-connected build.
`npm run build` produces a static `dist/` that Vercel serves as-is.

## Read this before changing the engine

`docs/ALGORITHM.md` records four bugs in the source disclosure, one of which
matters urgently: **the Birth Card index must be rounded, not truncated.** A
Swift `Int()` cast written straight from the disclosure produces the wrong card
for a large share of the year. If the client has an existing backend, check
that first.
