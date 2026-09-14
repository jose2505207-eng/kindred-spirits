"""
Kindred Spirits Forecaster - reference implementation.

Built from the patent disclosure by Jack R. McKeown Sr. & Jack R. McKeown Jr.
(Confidential). Section names below map to headings in that document.

Provenance of every data table is marked:
  [DOC]     stated in the disclosure text
  [FIG]     transcribed from an embedded figure image
  [DERIVED] deduced and then validated against Appendix B (see self_test())
  [ASSUMED] not in the disclosure - needs confirmation from the authors
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Iterable

# ---------------------------------------------------------------------------
# Card naming
# ---------------------------------------------------------------------------
# [DERIVED] The disclosure only states SpiritualCardDeck[01] == "Ace of Hearts",
# that suits run Hearts, Clubs, Diamonds, Spades, and that each suit is Ace(1)
# .. King(13). That fully determines a sequential mapping. Validated against
# every fixed/semi-fixed card the doc names (2, 9, 11, 14, 21, 33, 52) and
# against ~40 rows of the Appendix B chart.

JOKER = "Joker"
SUITS = ("Hearts", "Clubs", "Diamonds", "Spades")
RANKS = ("Ace", "Two", "Three", "Four", "Five", "Six", "Seven",
         "Eight", "Nine", "Ten", "Jack", "Queen", "King")
SHORT_RANK = ("A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K")
SHORT_SUIT = {"Hearts": "H", "Clubs": "C", "Diamonds": "D", "Spades": "S"}


def spiritual_card_name(number: int) -> str:
    """Spiritual Card Dictionary. Index 0 is the Joker (Dec 31)."""
    if number == 0:
        return JOKER
    if not 1 <= number <= 52:
        raise ValueError(f"card number out of range: {number}")
    return f"{RANKS[(number - 1) % 13]} of {SUITS[(number - 1) // 13]}"


def short(name: str) -> str:
    if name == JOKER:
        return "JOK"
    rank, _, suit = name.partition(" of ")
    return SHORT_RANK[RANKS.index(rank)] + SHORT_SUIT[suit]


SPIRITUAL_DECK = {n: spiritual_card_name(n) for n in range(0, 53)}

# ---------------------------------------------------------------------------
# The Life Spread deck
# ---------------------------------------------------------------------------
# [FIG] Transcribed from Figure 5 ("The Life Spread"), reading each row of the
# spread left to right against the DECK_ARRAY numbering below.
# Cross-checks that all passed: 52=K of Spades, 11=Jack of Hearts and
# 21=Eight of Clubs are unchanged from the Spiritual deck (the fixed cards);
# 2 and 14 swap; 9 and 33 swap (the semi-fixed cards); all 52 cards appear
# exactly once.

_LIFE_SHORT = {
    52: "KS", 51: "8D", 50: "10C",
    7: "AS",  6: "3D", 5: "5C",  4: "10S", 3: "QC",  2: "AC",  1: "3H",
    14: "2H", 13: "9S", 12: "9C", 11: "JH", 10: "5S", 9: "7D",  8: "7H",
    21: "8C", 20: "JS", 19: "2D", 18: "4C", 17: "6H", 16: "KD", 15: "KH",
    28: "AD", 27: "AH", 26: "8S", 25: "10D", 24: "10H", 23: "4S", 22: "6D",
    35: "5D", 34: "7C", 33: "9H", 32: "3S", 31: "3C", 30: "5H", 29: "QD",
    42: "JD", 41: "KC", 40: "2C", 39: "7S", 38: "9D", 37: "JC", 36: "QS",
    49: "QH", 48: "6S", 47: "6C", 46: "8H", 45: "2S", 44: "4D", 43: "4H",
}


def _expand(s: str) -> str:
    suit = {"H": "Hearts", "C": "Clubs", "D": "Diamonds", "S": "Spades"}[s[-1]]
    return f"{RANKS[SHORT_RANK.index(s[:-1])]} of {suit}"


LIFE_DECK = {0: JOKER}
LIFE_DECK.update({n: _expand(s) for n, s in _LIFE_SHORT.items()})
LIFE_INDEX = {name: n for n, name in LIFE_DECK.items() if n}
SPIRITUAL_INDEX = {name: n for n, name in SPIRITUAL_DECK.items() if n}

# ---------------------------------------------------------------------------
# The Deck Array (Figure 4) - positional layout shared by both spreads
# ---------------------------------------------------------------------------
DECK_ARRAY = [
    [-1, -1, 52, 51, 50, -1, -1],
    [7, 6, 5, 4, 3, 2, 1],
    [14, 13, 12, 11, 10, 9, 8],
    [21, 20, 19, 18, 17, 16, 15],
    [28, 27, 26, 25, 24, 23, 22],
    [35, 34, 33, 32, 31, 30, 29],
    [42, 41, 40, 39, 38, 37, 36],
    [49, 48, 47, 46, 45, 44, 43],
]
_POSITION = {v: (i, j) for i, row in enumerate(DECK_ARRAY)
             for j, v in enumerate(row) if v != -1}

VENUS_OFFSET = 2    # [DOC] friendship / love
JUPITER_OFFSET = 4  # [DOC] business

# ---------------------------------------------------------------------------
# Zodiac and planetary offsets
# ---------------------------------------------------------------------------
# [DOC] planetary offsets, counted outward from the Sun with Earth skipped.
PLANET_OFFSET = {
    "Moon": -1, "Sun": 0, "Mercury": 1, "Venus": 2, "Mars": 3,
    "Jupiter": 4, "Saturn": 5, "Uranus": 6, "Neptune": 7, "Pluto": 8,
}

# [DERIVED] The disclosure defines a ZodiacDictionary but never prints it.
# These rulerships were inferred from standard astrology, then validated
# against the Appendix B PRC column (Capricorn->Saturn, Aquarius->Uranus,
# Gemini->Mercury, Cancer->Moon all confirmed). Scorpio having two rulers
# matches the doc's note that Scorpio passes through the logic twice.
SIGN_RULERS = {
    "Aries": ["Mars"], "Taurus": ["Venus"], "Gemini": ["Mercury"],
    "Cancer": ["Moon"], "Leo": ["Sun"], "Virgo": ["Mercury"],
    "Libra": ["Venus"], "Scorpio": ["Mars", "Pluto"],
    "Sagittarius": ["Jupiter"], "Capricorn": ["Saturn"],
    "Aquarius": ["Uranus"], "Pisces": ["Neptune"],
}

# [DERIVED] Sign start dates taken from the cusp table at the foot of
# Appendix B (the dates listed there are exactly the boundary days).
# NOTE: this disagrees with the one range the prose gives - the doc says
# Gemini is day-of-year 140..171, which would end Gemini on Jun 20, but the
# Appendix B chart itself shows Jun 21 using the Mercury offset. The chart
# wins here. Flag for the authors.
SIGN_STARTS = [
    (1, 21, "Aquarius"), (2, 20, "Pisces"), (3, 20, "Aries"),
    (4, 20, "Taurus"), (5, 20, "Gemini"), (6, 22, "Cancer"),
    (7, 23, "Leo"), (8, 22, "Virgo"), (9, 22, "Libra"),
    (10, 23, "Scorpio"), (11, 21, "Sagittarius"), (12, 21, "Capricorn"),
]

# [FIG] Cusp days from the Appendix B footer table. On these days the chart's
# PRC column shows the *earlier* sign's card and the footer table supplies the
# *later* sign's card, i.e. both signs apply.
CUSP_DAYS = {
    (1, 21), (2, 20), (3, 20), (3, 21), (4, 20), (4, 21),
    (5, 20), (5, 21), (5, 22), (6, 22), (7, 23), (8, 22), (8, 23),
    (9, 22), (9, 23), (10, 23), (11, 21), (11, 22), (12, 21), (12, 22),
}

# ---------------------------------------------------------------------------
# The Algorithm Input / The Birth Card
# ---------------------------------------------------------------------------
M1 = -0.06567164  # [DOC] equation 3


def _is_leap(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def days_in_month(year: int) -> list[int]:
    d = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if _is_leap(year):
        d[1] = 29
    return d


def first_day_of_month(month: int, year: int) -> int:
    """[DOC] loop from the Swift snippet, plus the +1 zero-index correction."""
    return sum(days_in_month(year)[: month - 1]) + 1


def day_of_year(month: int, day: int, year: int) -> int:
    return first_day_of_month(month, year) + day - 1


def birth_card_number(month: int, day: int, year: int) -> int:
    """[DOC] equations 4 and 7.

    The disclosure never states how the float result becomes an integer index.
    It must be round-half-up, not truncation. Truncation happens to agree for
    January, June and December (where the fractional part is near zero) but
    breaks in February: Feb 17 computes to 33.964, and Appendix B shows the
    Eight of Diamonds (34), not the Seven (33). Rounding also reproduces the
    doc's May 31 example and lands Dec 31 on index 0, which Appendix B labels
    JOKER. Worth confirming with the authors, since a Swift Int() cast would
    truncate and silently produce the wrong card for much of the year.
    """
    fdom = first_day_of_month(month, year)
    doy = day_of_year(month, day, year)
    first_days_card = M1 * (fdom - 1.0) + 52.0
    return int(fdom - doy + first_days_card + 0.5)


def zodiac_signs(month: int, day: int) -> list[str]:
    """Returns one sign, or two when the date falls on a cusp."""
    sign = "Capricorn"
    for m, d, name in SIGN_STARTS:
        if (month, day) >= (m, d):
            sign = name
    if (month, day) in CUSP_DAYS:
        prior = "Capricorn"
        for m, d, name in SIGN_STARTS:
            if (month, day) > (m, d):
                prior = name
        idx = [s for _, _, s in SIGN_STARTS]
        prior = idx[idx.index(sign) - 1] if sign in idx else "Capricorn"
        return [prior, sign]
    return [sign]


# ---------------------------------------------------------------------------
# The Planetary Ruling Card(s)
# ---------------------------------------------------------------------------
def _wrap(n: int) -> int:
    """Indices run 1..52 and wrap; the crown row needs this (e.g. K of Spades
    at 52 with a Saturn offset of 5 lands on 5, the Five of Clubs, which is
    what Appendix B shows for Jan 1)."""
    return (n - 1) % 52 + 1


def planetary_ruling_cards(birth_card: str, month: int, day: int) -> dict:
    """[DERIVED] The doc says the offset is applied to 'both the Birth card
    number and the Life card number'. Concretely: take the card's index in a
    spread, add the ruling planet's offset (which walks left along the row),
    and read the name back out of that same spread.

    Validated against ~40 Appendix B rows across January and June, including
    both cusp days and the wrap case. The PRC column printed in Appendix B is
    the Life-spread card.
    """
    out = {"signs": zodiac_signs(month, day), "rulers": [],
           "life_pr": [], "spiritual_pr": []}
    if birth_card == JOKER:
        return out
    for sign in out["signs"]:
        for planet in SIGN_RULERS[sign]:
            off = PLANET_OFFSET[planet]
            out["rulers"].append((sign, planet, off))
            out["life_pr"].append(LIFE_DECK[_wrap(LIFE_INDEX[birth_card] + off)])
            out["spiritual_pr"].append(
                SPIRITUAL_DECK[_wrap(SPIRITUAL_INDEX[birth_card] + off)])
    return out


# ---------------------------------------------------------------------------
# Diagonal elements
# ---------------------------------------------------------------------------
def diagonal_elements(card_number: int, offset: int, deck: dict) -> list[str]:
    """[DOC] the four M(i±k, j±k) cards. Indices off the spread are blank and
    are dropped."""
    if card_number not in _POSITION:
        return []
    i, j = _POSITION[card_number]
    out = []
    for di in (-offset, offset):
        for dj in (-offset, offset):
            r, c = i + di, j + dj
            if 0 <= r < len(DECK_ARRAY) and 0 <= c < 7:
                v = DECK_ARRAY[r][c]
                if v != -1:
                    out.append(deck[v])
    return out


# ---------------------------------------------------------------------------
# Fixed and semi-fixed cards
# ---------------------------------------------------------------------------
# [DOC] fixed: Jack of Hearts (11), Eight of Clubs (21), King of Spades (52).
# semi-fixed pairs: 2/14 and 9/33.
FIXED_AND_SEMIFIXED = [11, 21, 52, 2, 14, 9, 33]


def fixed_partners(card_number: int) -> list[str]:
    """If the card is one of the seven, the other six are added."""
    if card_number not in FIXED_AND_SEMIFIXED:
        return []
    return [SPIRITUAL_DECK[n] for n in FIXED_AND_SEMIFIXED if n != card_number]


# ---------------------------------------------------------------------------
# The Karma Card
# ---------------------------------------------------------------------------
def karma_cards(card_name: str) -> dict:
    """[DOC] each spread indexed with the *other* spread's number."""
    return {
        "karma_birth": LIFE_DECK[SPIRITUAL_INDEX[card_name]],
        "karma_life": SPIRITUAL_DECK[LIFE_INDEX[card_name]],
    }


# ---------------------------------------------------------------------------
# Life Path Compatibility
# ---------------------------------------------------------------------------
LIFE_PATH_MATRIX = [[1, 5, 7], [2, 4, 8], [3, 6, 9]]          # [DOC]
LIFE_COMPATIBILITY_ARRAY = [                                   # [DOC]
    [3, 9], [3, 6], [1, 2, 5], [6, 7], [3, 9], [2, 4, 8], [4], [6], [1, 5],
]


def _reduce(n: int) -> int:
    while n > 9:
        n = sum(int(c) for c in str(n))
    return n


def life_path_number(month: int, day: int, year: int) -> int:
    """[DOC] sum MM, then the digits of DD, then the digits of YYYY, reduce."""
    total = month + sum(int(c) for c in f"{day:02d}") + sum(int(c) for c in str(year))
    return _reduce(total)


def life_path_compatible(a: int, b: int) -> str | None:
    for row in LIFE_PATH_MATRIX:
        if a in row and b in row:
            return "natural"
    if b in LIFE_COMPATIBILITY_ARRAY[a - 1] or a in LIFE_COMPATIBILITY_ARRAY[b - 1]:
        return "lesser"
    return None


# ---------------------------------------------------------------------------
# Forecast assembly
# ---------------------------------------------------------------------------
@dataclass
class Forecast:
    month: int
    day: int
    year: int
    birth_card: str
    birth_card_number: int
    signs: list[str]
    planetary_ruling_cards: list[str]
    life_path: int
    kindred_spirits: list[str] = field(default_factory=list)


def forecast(month: int, day: int, year: int, *, business: bool = False,
             reference_year: int | None = None) -> Forecast:
    """business=True selects the Jupiter (offset 4) connection instead of
    Venus (offset 2).

    reference_year: the doc says February's length comes from the *current*
    year, not the birth year. That is reproduced here but is almost certainly
    a bug - it makes a person's Birth Card depend on when they run the app.
    Pass reference_year=None to use the birth year instead (recommended).
    """
    calc_year = reference_year if reference_year is not None else year
    n = birth_card_number(month, day, calc_year)
    birth_card = SPIRITUAL_DECK[n]
    offset = JUPITER_OFFSET if business else VENUS_OFFSET

    pr = planetary_ruling_cards(birth_card, month, day)

    # Appendix B labels Dec 31 JOKER. Index 0 has no position in either spread,
    # so there is no ruling card and no list. The disclosure never mentions
    # this case; surface it rather than crash.
    if birth_card == JOKER:
        return Forecast(month, day, year, JOKER, 0, pr["signs"], [],
                        life_path_number(month, day, year), [])

    prc_names = pr["life_pr"]

    lst: list[str] = []
    lst += diagonal_elements(n, offset, SPIRITUAL_DECK)
    if not business:
        lst += fixed_partners(n)
    lst += diagonal_elements(LIFE_INDEX[birth_card], offset, LIFE_DECK)

    for prc in prc_names:
        pn = LIFE_INDEX[prc]
        lst += diagonal_elements(pn, offset, LIFE_DECK)
        if not business:
            lst += fixed_partners(SPIRITUAL_INDEX[prc])
        lst += diagonal_elements(SPIRITUAL_INDEX[prc], offset, SPIRITUAL_DECK)

    km = karma_cards(birth_card)
    karma = [km["karma_birth"], km["karma_life"]]
    for prc in prc_names:
        k = karma_cards(prc)
        karma += [k["karma_birth"], k["karma_life"]]
    if not business:
        lst += karma
    for k in karma:
        lst += diagonal_elements(SPIRITUAL_INDEX[k], offset, SPIRITUAL_DECK)
        lst += diagonal_elements(LIFE_INDEX[k], offset, LIFE_DECK)

    excluded = {birth_card, *prc_names}
    seen, clean = set(), []
    for c in lst:
        if c and c not in excluded and c not in seen:
            seen.add(c)
            clean.append(c)

    return Forecast(month, day, year, birth_card, n, pr["signs"],
                    prc_names, life_path_number(month, day, year), clean)


def compare(a: Forecast, b: Forecast) -> dict:
    """[DOC] each list is checked against the other birthdate's BC and PRC."""
    a_targets = {a.birth_card, *a.planetary_ruling_cards}
    b_targets = {b.birth_card, *b.planetary_ruling_cards}
    return {
        "a_list_matches_b": sorted(set(a.kindred_spirits) & b_targets),
        "b_list_matches_a": sorted(set(b.kindred_spirits) & a_targets),
        "life_path": (a.life_path, b.life_path,
                      life_path_compatible(a.life_path, b.life_path)),
    }


# ---------------------------------------------------------------------------
# Self-test against the disclosure's worked example and Appendix B
# ---------------------------------------------------------------------------
# [FIG] transcribed rows: (month, day, Birth Card, PRC as printed)
APPENDIX_B_SAMPLE = [
    (1, 1, "KS", "5C"), (1, 2, "QS", "KC"), (1, 3, "JS", "10D"),
    (1, 4, "10S", "7D"), (1, 5, "9S", "4C"), (1, 6, "8S", "3C"),
    (1, 7, "7S", "4D"), (1, 8, "6S", "3H"), (1, 9, "5S", "KH"),
    (1, 10, "4S", "AD"), (1, 11, "3S", "JC"), (1, 12, "2S", "10C"),
    (1, 13, "AS", "9C"), (1, 14, "KD", "8C"), (1, 15, "QD", "7C"),
    (1, 16, "JD", "6C"), (1, 17, "10D", "5H"), (1, 18, "9D", "4H"),
    (1, 19, "8D", "10S"), (1, 20, "7D", "2H"), (1, 21, "6D", "AH"),
    (1, 22, "5D", "KC"), (1, 23, "4D", "10C"), (1, 24, "3D", "9C"),
    (1, 25, "2D", "10D"),
    (2, 1, "JS", "8S"), (2, 2, "10S", "5S"), (2, 3, "9S", "2D"),
    (2, 4, "8S", "3S"), (2, 5, "7S", "2S"), (2, 6, "6S", "AC"),
    (2, 7, "5S", "KD"), (2, 8, "4S", "QD"), (2, 9, "3S", "9D"),
    (2, 10, "2S", "8D"), (2, 11, "AS", "9S"), (2, 12, "KD", "6D"),
    (2, 13, "QD", "5D"), (2, 14, "JD", "6S"), (2, 15, "10D", "3C"),
    (2, 16, "9D", "4D"), (2, 17, "8D", "5C"), (2, 18, "7D", "KH"),
    (2, 19, "6D", "AD"), (2, 20, "5D", "KC"), (2, 21, "4D", "8D"),
    (2, 22, "3D", "9S"), (2, 23, "2D", "8S"), (2, 24, "AD", "5D"),
    (3, 1, "9S", "JS"), (3, 2, "8S", "9H"), (3, 3, "7S", "8H"),
    (3, 4, "6S", "QC"), (3, 5, "5S", "6H"), (3, 6, "4S", "5H"),
    (3, 7, "3S", "7S"), (3, 8, "2S", "KS"), (3, 9, "AS", "2H"),
    (3, 10, "KD", "4S"), (3, 11, "QD", "QS"), (3, 12, "JD", "QH"),
    (6, 19, "JC", "9D"), (6, 20, "10C", "8D"), (6, 21, "9C", "9S"),
    (6, 22, "8C", "6D"), (6, 23, "7C", "9H"), (6, 24, "6C", "8H"),
    (6, 25, "5C", "10S"),
    (12, 30, "AH", None), (12, 31, JOKER, None),
]
# [FIG] cusp footer table: the *second* sign's PRC on dual-ruled days
CUSP_SECOND_PRC = {(1, 21): "AD", (6, 22): "JS"}


def self_test(year: int = 1961) -> None:
    ok = 0
    for m, d, bc, prc in APPENDIX_B_SAMPLE:
        n = birth_card_number(m, d, year)
        got = SPIRITUAL_DECK[n]
        want = bc if bc == JOKER else _expand(bc)
        assert got == want, f"{m}/{d} birth card: got {got}, chart says {want}"
        ok += 1
        if prc:
            pr = planetary_ruling_cards(got, m, d)
            assert pr["life_pr"][0] == _expand(prc), (
                f"{m}/{d} PRC: got {pr['life_pr']}, chart says {prc}")
            ok += 1
            if (m, d) in CUSP_SECOND_PRC:
                assert pr["life_pr"][1] == _expand(CUSP_SECOND_PRC[(m, d)]), (
                    f"{m}/{d} cusp second PRC mismatch: {pr['life_pr']}")
                ok += 1

    # The disclosure's own worked example.
    f = forecast(5, 31, 1961)
    assert f.birth_card_number == 14, f.birth_card_number
    assert f.birth_card == "Ace of Clubs", f.birth_card
    assert f.signs == ["Gemini"], f.signs
    assert f.planetary_ruling_cards == ["Queen of Clubs"], f.planetary_ruling_cards
    assert f.life_path == 8, f.life_path
    ok += 5

    # Example 1 from the Output Examples section.
    g = forecast(1, 25, 1971)
    assert g.birth_card == "Two of Diamonds", g.birth_card
    assert g.signs == ["Aquarius"], g.signs
    assert g.planetary_ruling_cards == ["Ten of Diamonds"], g.planetary_ruling_cards
    assert g.life_path == 8, g.life_path
    ok += 4

    # Known delta, recorded rather than asserted: for May 31 the doc's Output
    # Example 1 narrative lists 20 cards; this produces those 20 plus the Six
    # of Hearts. It arrives as a Life-spread diagonal of the Karma Planetary
    # Ruling Card (Three of Hearts). The doc's prose does not say whether
    # Karma-card diagonals are taken in one spread or both; taking them in
    # both is required to produce the Eight of Spades the doc *does* list, so
    # the rule is applied uniformly here. Ask the authors which is intended.
    example1 = set(short(c) for c in f.kindred_spirits)
    expected1 = set("KS KC 4C 5C 8S KH 2S JD 9H 2D 6C 2C 9S JC 7D JH 8C 2H "
                    "3H 10D".split())
    assert expected1 <= example1, sorted(expected1 - example1)
    if example1 - expected1:
        print(f"  note: extra vs doc example 1: {sorted(example1 - expected1)}")

    # Example 2 (Jupiter) and examples 3, 4.
    h = forecast(2, 17, 1963)
    assert h.birth_card == "Eight of Diamonds", h.birth_card
    assert h.planetary_ruling_cards == ["Five of Clubs"], h.planetary_ruling_cards
    assert h.life_path == 2, h.life_path
    i = forecast(12, 29, 1981)
    assert i.birth_card == "Two of Hearts", i.birth_card
    assert i.planetary_ruling_cards == ["Two of Diamonds"], i.planetary_ruling_cards
    assert i.life_path == 6, i.life_path
    j = forecast(11, 28, 1989)
    assert j.birth_card == "Five of Hearts", j.birth_card
    assert j.planetary_ruling_cards == ["Seven of Clubs"], j.planetary_ruling_cards
    assert j.life_path == 3, j.life_path
    ok += 9

    print(f"self_test: {ok} assertions passed")


if __name__ == "__main__":
    self_test()
    f = forecast(5, 31, 1961)
    g = forecast(1, 25, 1971)
    print(f"\n{f.month}/{f.day}/{f.year}  {f.birth_card} ({f.birth_card_number})"
          f"  PRC {f.planetary_ruling_cards}  {f.signs}  LP {f.life_path}")
    print(f"  Kindred Spirits ({len(f.kindred_spirits)}): "
          f"{', '.join(short(c) for c in f.kindred_spirits)}")
    print(f"\n{g.month}/{g.day}/{g.year}  {g.birth_card} ({g.birth_card_number})"
          f"  PRC {g.planetary_ruling_cards}  {g.signs}  LP {g.life_path}")
    print(f"  Kindred Spirits ({len(g.kindred_spirits)}): "
          f"{', '.join(short(c) for c in g.kindred_spirits)}")
    print(f"\ncompare: {compare(f, g)}")
