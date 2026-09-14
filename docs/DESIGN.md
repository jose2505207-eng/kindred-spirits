# Product and design

## What this is

A dating app where compatibility comes from a card-divination reading of two
birthdates, not from photos and shared interests. The reading is the product's
whole reason to exist, so the interface has to make it feel earned and legible
rather than like a horoscope generator.

This repo is a **clickable prototype for client review**. It is not production.
No accounts, no backend, no real users. Profiles are seeded fixtures.

## The flow

```
  Onboarding
     name, birthdate, what you're looking for (love / business)
     → one card-turn moment revealing your Birth Card
     → straight into Matches
                            ↓
  ┌──────────┬──────────┬──────────┬───────────┐
  │ Matches  │ Messages │ Bowties  │ About you │   ← four tabs
  └──────────┴──────────┴──────────┴───────────┘
```

**Matches** is the default landing surface. The user should never be forced
through their own reading to get to people. A feed of candidates ranked by how
strongly their cards hit the user's Kindred Spirits list. Tapping one opens the
match reading: why these two are strong, naming the actual card matches and the
Life Path relationship.

**About you** is opt-in. Your own full reading — Birth Card, Planetary Ruling
Card, sign, Life Path, your position in the spread, your Kindred Spirits list.
At the bottom of this page only: an option to book a deeper reading with an
astrologer. It does not appear in the matches flow.

### Ranking

Score a candidate on what the disclosure already defines. Do not invent a
compatibility metric on top:

- their Birth Card or Ruling Card appears in your Kindred Spirits list
- your Birth Card or Ruling Card appears in theirs (mutual is stronger)
- a card appearing in both the Birth Card diagonals and the Karma Birth Card
  diagonals — the disclosure calls this a rare and powerful match
- Life Path in the same row of the Pythagorean matrix (natural), or in the
  lesser-compatibility array

The disclosure's own four Output Examples are the calibration: example 1 is "a
natural fit", example 2 a strong business match, example 3 marginal, example 4
a rejection. Match copy should sound like those.

### Bowties

A bowtie is a person's emblem in place of a photo: a face (an emoji or an
uploaded image), a backdrop colour and a one-line caption. It shows on About
you, beside each person in the matches feed, at the top of a match reading and
on the Bowties wall, which lists everyone, yours first. It can be edited at any
time from About you or the wall. The wall is unranked and gives no reading
away, so it works in either feed mode.

### Messages

"Say hello" on a match reading opens a conversation. The transport is an
in-memory stub in `src/lib/messaging.js`, which also documents what a real
backend must expose. Seeded profiles reply once so a review thread is not
silent; that behaviour lives only in the stub.

## Design direction

Ground everything in the deck's own vernacular rather than generic mystic
styling. The memorable element is the spread itself — showing the user their
card sitting in the 8×7 layout with its diagonals lit is what makes the
algorithm legible instead of a black box. Spend the boldness there and keep
everything around it quiet.

Tokens, as used in `app/KindredSpirits.prototype.jsx`:

```
--felt    #0E241C   ground
--felt-2  #081713   inset surfaces
--felt-3  #16342A   borders, active segments
--ivory   #F3EEE2   card faces, primary text
--ink     #16140F   text on card faces
--red     #BE1C2D   hearts and diamonds
--brass   #C6A03C   lit positions, primary action — used sparingly
--mute    #87A196   secondary text
```

Type: Bodoni Moda for card indices, headings and the wordmark (Didone is what
engraved card faces actually use); Inter for interface text.

Motion: one orchestrated moment — the card turning over on reveal. Respect
`prefers-reduced-motion`. No entrance animations on every section.

## Open design question for the client

Does a match show its reading upfront as the hook, or only after both people
connect? This changes the whole feed. Worth building both and letting him
choose rather than picking one.

## Out of scope for the prototype

Auth, a messaging backend (the stub stands in), payments, photos (bowties
stand in), the astrologer booking itself (the
entry point is enough), push notifications, App Store or Play submission.
