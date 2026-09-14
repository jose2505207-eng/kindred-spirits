# The algorithm

Everything in `engine/` implements the *Kindred Spirits Forecaster* patent
disclosure by Jack R. McKeown Sr. and Jack R. McKeown Jr.

The disclosure is prose plus scanned figures. Several things the code needs are
not stated in the prose and had to be recovered from the figure images or
derived and then validated against the disclosure's own Appendix B chart. This
document records which is which, so nobody re-derives it and nobody "cleans up"
a number that is load-bearing.

Provenance tags used in the source:

| Tag | Meaning |
|---|---|
| `[DOC]` | stated in the disclosure prose |
| `[FIG]` | transcribed from an embedded figure image |
| `[DERIVED]` | deduced, then validated against the Appendix B chart |
| `[ASSUMED]` | not in the disclosure; needs the authors to confirm |

## What the prose gives you

- Day-of-year and `FirstDayOfTheMonth` computation (a Swift loop).
- The slope constant `m1 = -0.06567164` and equations 4 and 7 for the Birth
  Card Number.
- The Deck Array: the 8×7 positional layout, with `-1` for the empty corners.
- That Spiritual deck index 1 is the Ace of Hearts, suits run Hearts, Clubs,
  Diamonds, Spades, each Ace(1) through King(13).
- Venus offset 2 (love/friendship) and Jupiter offset 4 (business) diagonals.
- The fixed cards (Jack of Hearts 11, Eight of Clubs 21, King of Spades 52) and
  the two semi-fixed pairs (2/14 and 9/33).
- Karma cards: index each spread with the *other* spread's number.
- The Pythagorean Life Path matrix and the lesser-compatibility array.

## What had to be recovered

**The Spiritual deck mapping.** Only one entry is printed. The rest follows
from the stated suit order and is sequential. Confirmed against every fixed and
semi-fixed card the prose names, and against ~70 chart rows.

**The Life Spread deck.** Exists only as a photograph of laid-out cards
(Figure 5). Transcribed by reading each row left to right against the Deck
Array numbering. It self-validates: the three fixed cards hold position, both
semi-fixed pairs swap, and all 52 cards appear exactly once. `engine.test.mjs`
asserts this.

**The Planetary Ruling Card rule.** The disclosure defines a `ZodiacDictionary`
and lists planetary offsets, but never says how the offset is applied. The rule
is: take the Birth Card's index *in the Life Spread*, add the ruling planet's
offset (which walks left along a row), wrap modulo 52, and read the name back
out of the Life Spread. The PRC column printed in Appendix B is this
Life-spread card.

Validated on ~70 dates across January, February, March, June and December,
including both cusp days and the wrap case — Jan 1 is the King of Spades at
index 52, plus Saturn's offset of 5, wrapping to 5, the Five of Clubs, which is
what the chart shows.

**Sign rulerships.** Standard astrology, confirmed against the chart for
Capricorn→Saturn, Aquarius→Uranus, Gemini→Mercury and Cancer→Moon. Scorpio
having two rulers (Mars and Pluto) matches the prose note that Scorpio passes
through the logic twice. Leo→Sun means offset 0, so a Leo's ruling card is
their own Life card — which is correct in this tradition, not a bug.

## Bugs found in the disclosure

**1. Rounding, not truncation.** The prose never says how the float Birth Card
Number becomes an integer index. It must be round-half-up. Truncation happens
to agree for January, June and December, where the fractional part is near
zero, but breaks badly elsewhere: Feb 17 computes to 33.964, and the chart
shows the Eight of Diamonds (34), not the Seven (33).

This matters because a Swift `Int()` cast truncates. If the client's existing
backend was written straight from the disclosure, it is probably wrong for a
large share of the year. **Check this against their implementation before
anything else.** `engine.test.mjs` has a dedicated test for it.

**2. Gemini's stated range is off by a day.** The prose says Gemini is
day-of-year 140–171, ending Jun 20. The chart itself shows Jun 21 computed with
the Mercury offset. The chart wins here; sign boundaries in the code come from
the cusp table at the foot of Appendix B.

**3. February's length comes from the current year, not the birth year.** As
written, a person's Birth Card would depend on when they run the app. The
shift happens to cancel out in the Birth Card equation, but it is fragile.
`forecast()` takes an optional reference year; default is the birth year.

**4. December 31 is the Joker.** It maps to index 0, which has no position in
either spread, so there is no ruling card and no Kindred Spirits list. The
disclosure never mentions this. Both engines now return an empty reading
instead of throwing. **Product decision needed:** a Dec 31 user currently gets
"no matches", which is a bad first run.

Pending an answer, the prototype degrades rather than pretending: the reveal
and both tabs say plainly that Dec 31 falls outside both spreads, so there is
no ruling card and no Kindred Spirits list, and the feed is ordered on life
path alone. It points at this question rather than inventing a rule.

## Known open question

For May 31 the engine produces the 20 cards the disclosure's Output Example 1
lists, plus the Six of Hearts. It arrives as a Life-spread diagonal of the
Karma Planetary Ruling Card. Taking Karma-card diagonals in *both* spreads is
required to produce the Eight of Spades that the example *does* list, so the
rule is applied uniformly — which yields one extra. The prose is ambiguous
about whether Karma diagonals are taken in one spread or both.

Recorded, not asserted, in `engine/kindred_spirits.py::self_test`.

## Questions for the authors

1. Round-half-up or truncate? (We are confident it is round; confirm anyway.)
2. Karma-card diagonals — one spread or both?
3. Exact zodiac day boundaries, since the prose and the chart disagree.
4. What should a December 31 user see?
5. Full Appendix B transcription would let us verify all 366 days rather than
   the ~70 currently in the fixture. Is a machine-readable version available?
