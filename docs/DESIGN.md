# Product and design

## What this is

A dating app where compatibility comes from a card-divination reading of two
birthdates, not from photos and shared interests. The reading is the product's
whole reason to exist, so the interface has to make it feel earned and legible
rather than like a horoscope generator.

This repo is the app on a Supabase backend: accounts, profiles, photos,
connections and messages are real. It is not yet in front of real people — see
"Before real people use it" under the data model. `VITE_DEMO_MODE=true` keeps
the original client-review build, on seeded fixture profiles with no accounts.

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

"Say hello" on a match reading opens a conversation once the two of you are a
mutual match. `src/lib/messaging.js` is the only file that knows where messages
live: Supabase when signed in, with new messages pushed over Realtime, and an
in-memory stub in demo mode, where seeded profiles reply once so a review thread
is not silent.

### Photos

Up to six, managed on About you: add, caption, reorder, choose the primary,
delete. Other members see them as a strip on your match reading, beside the
reading rather than in place of it. The feed and the wall still show bowties.

### Block and report

At the foot of a match reading. A block takes both people out of each other's
matches, wall, messages and photos, and neither can write to the other; the
database enforces it, not the screens. A report goes to whoever moderates, and
the reported person is not told.

## Data model

Supabase project `ofmlahcfcuhwykgzupey`. The schema is the migrations in
`supabase/migrations/`, one per concern; `supabase/database.types.ts` is the
generated description of the result. RLS is on for every table, and helpers
that policies call live in the unexposed `private` schema.

```
auth.users ─1:1─ profiles ─1:n─ profile_photos ····· profile-photos/{user_id}/{uuid}.jpg
                   │ bowtie_image_path ·············· profile-photos/{user_id}/{uuid}.png
                   ├─ connections (from_profile → to_profile) ──▶ matches   (view)
                   ├─ blocks      (blocker_id → blocked_id)
                   ├─ reports     (reporter_id → reported_id, message_id)
                   └─ conversation_participants ─n:1─ conversations ─1:n─ messages
public_profiles (view over profiles, what the feed reads)
cards (52 cards and the Joker, generated from the engine) ····· card-art/v1/{code}.svg
```

| Table or view | Holds | Read by | Written by |
|---|---|---|---|
| `profiles` | name, birthdate, love or business, bio, visibility, bowtie | you; others once onboarded, visible and not blocked either way | you; the row is created by a trigger on sign-up and only goes with the account |
| `public_profiles` | the feed's columns | as `profiles` | — |
| `profile_photos` | path, caption, position, primary | anyone who can see the profile | you; a photo is deleted by deleting its file |
| `connections` | one-way connects | both ends, unless blocked | you, to someone you can see; you withdraw your own |
| `matches` | mutual connections, with a canonical `pair_key` | as `connections` | — |
| `blocks` | who blocked whom | the blocker only | the blocker |
| `reports` | reason, optionally the message | the reporter only | the reporter; moderation reads with the service role |
| `conversations` | `pair_key`, `last_message_at` | members, unless blocked | only `start_conversation()` |
| `conversation_participants` | who is in each | as `conversations` | only `start_conversation()` |
| `messages` | text, `sender_id`, `sent_at` | members, unless blocked | members, as themselves |
| `cards` | code, engine name, rank, suit, `is_red`, art path | anyone, signed in or not | migrations only |

What the database enforces, whatever a client sends:

- An onboarded profile has a name and a birthdate; the backdrop is one of the
  eight `BACKDROPS`; a bowtie caption is at most 60 characters.
- `start_conversation(other)` returns the same conversation for the same pair
  and refuses a pair that is not a mutual match or is blocked, with one message
  for both so nobody learns they were blocked.
- A message's `sender_id` must be the session, `sent_at` is the server's clock,
  and a sender gets 20 messages a minute. `last_message_at` is kept by trigger.
- Realtime publishes `messages`, `conversations` and `connections`, filtered by
  each subscriber's own RLS.
- Photo files can only be written inside their owner's folder. Deleting a file
  removes its row and clears a bowtie that used it; a row cannot be written
  before its file exists, or deleted on its own.

Storage:

- `profile-photos` is private: 5 MB, JPEG, PNG or WebP. Photos are shown through
  signed URLs that last an hour, which only a member who can see the profile can
  create.
- `card-art` is public, SVG only, with no client writes;
  `scripts/upload-card-art.mjs` fills it.

What it never holds: a reading, a card assignment, a tier or a score.

### Before real people use it

- **Deleting an account.** There is no flow for it. Deleting a user removes
  their rows but not their files, so it has to empty their photo folder through
  the Storage API first.
- **Stray uploads.** A file whose upload succeeded but whose row was never
  written stays in the bucket. A periodic sweep would catch it.
- **Auth settings.** Leaked password protection needs the Pro plan, and sign-up
  confirmation emails need a real SMTP sender instead of Supabase's rate-limited
  default.
- **Signed photo URLs** work for anyone holding one until the hour is up.
- **Birthdates** are visible to members; see the next section.

## Who can see a birth year

Ranking needs every candidate's full birthdate, year included: the engine reads
day and month for the cards and the whole date for the Life Path. Wherever
ranking runs has to hold everyone's birthdate. There are two places it can run.

**A. On the client, over `public_profiles`. This is what we are on.**
The `public_profiles` view gives a signed-in member the columns the feed needs
— id, name, birthdate, bio and bowtie — for every other person who has onboarded,
is visible, and has not blocked or been blocked by them. The client runs
`rank()` unchanged. Simple, and the engine never leaves the app bundle.

The cost is plain: **every signed-in member can read every visible member's
exact date of birth**, through the view or straight from `profiles`. The view
narrows columns and rows; it cannot hide the one field the engine needs. What
does remove a person is `is_visible = false` or a block, both enforced in RLS.

**B. On the server, in a `rank_candidates` Edge Function.**
The function imports `engine/kindredEngine.js` and `src/lib/ranking.js`
untouched (the engine imports nothing, so it runs in Deno as it is), reads
birthdates with the service role, ranks, and returns per candidate only what
the screens draw: display fields, the cards the match reading shows, the Life
Path relationship and the tier. Never a birthdate, never a year. The profiles
SELECT policy then narrows to your own row, and other people's display fields
come from a view with no birthdate column.

What B costs, and what it does not buy:

- **The engine leaves the repo.** Its source is deployed to Supabase's Edge
  Function infrastructure. That is private, but it is a second place the
  confidential code lives.
- **The cards still point at a birthday.** A Birth Card and a Planetary Ruling
  Card together narrow a person to very few days of the year, so B hides the
  year far better than it hides the day and month.
- **Age gives the year back.** The feed shows each person's age. With the
  birthday nearly known, an exact age is the year. B only protects the year if
  the feed shows no age, or a range.
- **Match readings need the other person's reading.** `MatchReading.jsx`
  receives the candidate's full `fc`. B means the function returns a trimmed
  reading, and the screen is changed to draw from that.

If exact dates of birth must not be visible to other members, move to B and
drop exact ages at the same time. Until then we are on A, knowingly.

### No cached scores

There is no `match_scores` table. A tier is only correct if the engine
produced it. The database cannot compute one without reimplementing the
engine, and a tier written by a client could be forged by that client. A cache
earns its place once ranking moves server-side (option B), where the function
can write scores keyed by `engine_version` and recompute them from scratch.

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

## Out of scope

Payments, the astrologer booking itself (the entry point is enough), push
notifications, read receipts, App Store or Play submission.
