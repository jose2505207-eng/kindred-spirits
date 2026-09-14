/**
 * Kindred Spirits Forecaster — reading engine.
 *
 * Pure functions. No React, no DOM, no platform APIs: this file is shared
 * verbatim between the web prototype and any future React Native build.
 *
 * Derived from the confidential patent disclosure by Jack R. McKeown Sr. and
 * Jack R. McKeown Jr. See docs/ALGORITHM.md for the provenance of every table
 * here and for what the disclosure leaves undefined.
 *
 * Do not change the numbers in this file without running `npm test`. The
 * tests check it against dates transcribed from the disclosure's own
 * Appendix B chart and against the Python reference implementation.
 */

const JOKER = "Joker";
const SUITS = ["Hearts", "Clubs", "Diamonds", "Spades"];
const RANKS = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Jack", "Queen", "King"];
const SHORT_RANK = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUIT_GLYPH = { Hearts: "\u2665", Clubs: "\u2663", Diamonds: "\u2666", Spades: "\u2660" };

function spiritualCardName(n) {
  if (n === 0) return JOKER;
  return `${RANKS[(n - 1) % 13]} of ${SUITS[Math.floor((n - 1) / 13)]}`;
}
function parts(name) {
  if (name === JOKER) return { rank: "JOK", suit: null, red: false };
  const [rank, suit] = name.split(" of ");
  return {
    rank: SHORT_RANK[RANKS.indexOf(rank)],
    suit,
    red: suit === "Hearts" || suit === "Diamonds",
  };
}

const SPIRITUAL_DECK = {};
for (let n = 0; n <= 52; n++) SPIRITUAL_DECK[n] = spiritualCardName(n);

// Transcribed from Figure 5 of the disclosure.
const LIFE_SHORT = {
  52: "KS", 51: "8D", 50: "10C",
  7: "AS", 6: "3D", 5: "5C", 4: "10S", 3: "QC", 2: "AC", 1: "3H",
  14: "2H", 13: "9S", 12: "9C", 11: "JH", 10: "5S", 9: "7D", 8: "7H",
  21: "8C", 20: "JS", 19: "2D", 18: "4C", 17: "6H", 16: "KD", 15: "KH",
  28: "AD", 27: "AH", 26: "8S", 25: "10D", 24: "10H", 23: "4S", 22: "6D",
  35: "5D", 34: "7C", 33: "9H", 32: "3S", 31: "3C", 30: "5H", 29: "QD",
  42: "JD", 41: "KC", 40: "2C", 39: "7S", 38: "9D", 37: "JC", 36: "QS",
  49: "QH", 48: "6S", 47: "6C", 46: "8H", 45: "2S", 44: "4D", 43: "4H",
};
function expand(s) {
  const suit = { H: "Hearts", C: "Clubs", D: "Diamonds", S: "Spades" }[s.slice(-1)];
  return `${RANKS[SHORT_RANK.indexOf(s.slice(0, -1))]} of ${suit}`;
}
const LIFE_DECK = { 0: JOKER };
Object.entries(LIFE_SHORT).forEach(([n, s]) => { LIFE_DECK[+n] = expand(s); });

const LIFE_INDEX = {}, SPIRITUAL_INDEX = {};
Object.entries(LIFE_DECK).forEach(([n, v]) => { if (+n) LIFE_INDEX[v] = +n; });
Object.entries(SPIRITUAL_DECK).forEach(([n, v]) => { if (+n) SPIRITUAL_INDEX[v] = +n; });

const DECK_ARRAY = [
  [-1, -1, 52, 51, 50, -1, -1],
  [7, 6, 5, 4, 3, 2, 1],
  [14, 13, 12, 11, 10, 9, 8],
  [21, 20, 19, 18, 17, 16, 15],
  [28, 27, 26, 25, 24, 23, 22],
  [35, 34, 33, 32, 31, 30, 29],
  [42, 41, 40, 39, 38, 37, 36],
  [49, 48, 47, 46, 45, 44, 43],
];
const POSITION = {};
DECK_ARRAY.forEach((row, i) => row.forEach((v, j) => { if (v !== -1) POSITION[v] = [i, j]; }));

const PLANET_OFFSET = {
  Moon: -1, Sun: 0, Mercury: 1, Venus: 2, Mars: 3,
  Jupiter: 4, Saturn: 5, Uranus: 6, Neptune: 7, Pluto: 8,
};
const SIGN_RULERS = {
  Aries: ["Mars"], Taurus: ["Venus"], Gemini: ["Mercury"], Cancer: ["Moon"],
  Leo: ["Sun"], Virgo: ["Mercury"], Libra: ["Venus"], Scorpio: ["Mars", "Pluto"],
  Sagittarius: ["Jupiter"], Capricorn: ["Saturn"], Aquarius: ["Uranus"], Pisces: ["Neptune"],
};
const SIGN_ORDER = ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini",
  "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius"];
const SIGN_STARTS = [
  [1, 21, "Aquarius"], [2, 20, "Pisces"], [3, 20, "Aries"], [4, 20, "Taurus"],
  [5, 20, "Gemini"], [6, 22, "Cancer"], [7, 23, "Leo"], [8, 22, "Virgo"],
  [9, 22, "Libra"], [10, 23, "Scorpio"], [11, 21, "Sagittarius"], [12, 21, "Capricorn"],
];
const CUSP_DAYS = new Set(["1-21", "2-20", "3-20", "3-21", "4-20", "4-21", "5-20",
  "5-21", "5-22", "6-22", "7-23", "8-22", "8-23", "9-22", "9-23", "10-23",
  "11-21", "11-22", "12-21", "12-22"]);

const M1 = -0.06567164;
const isLeap = (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const daysInMonth = (y) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const firstDayOfMonth = (m, y) => daysInMonth(y).slice(0, m - 1).reduce((a, b) => a + b, 0) + 1;
const dayOfYear = (m, d, y) => firstDayOfMonth(m, y) + d - 1;

// Round-half-up, not truncation — see the note in kindred_spirits.py.
function birthCardNumber(m, d, y) {
  const fdom = firstDayOfMonth(m, y);
  return Math.floor(fdom - dayOfYear(m, d, y) + (M1 * (fdom - 1) + 52) + 0.5);
}

function zodiacSigns(m, d) {
  let sign = "Capricorn";
  for (const [sm, sd, name] of SIGN_STARTS) {
    if (m > sm || (m === sm && d >= sd)) sign = name;
  }
  if (CUSP_DAYS.has(`${m}-${d}`)) {
    const i = SIGN_ORDER.indexOf(sign);
    return [SIGN_ORDER[(i + 11) % 12], sign];
  }
  return [sign];
}

const wrap = (n) => ((n - 1) % 52 + 52) % 52 + 1;

function planetaryRulingCards(birthCard, m, d) {
  const signs = zodiacSigns(m, d);
  const rulers = [], lifePr = [], spiritualPr = [];
  if (birthCard === JOKER) return { signs, rulers, lifePr, spiritualPr };
  for (const sign of signs) {
    for (const planet of SIGN_RULERS[sign]) {
      const off = PLANET_OFFSET[planet];
      rulers.push({ sign, planet, off });
      lifePr.push(LIFE_DECK[wrap(LIFE_INDEX[birthCard] + off)]);
      spiritualPr.push(SPIRITUAL_DECK[wrap(SPIRITUAL_INDEX[birthCard] + off)]);
    }
  }
  return { signs, rulers, lifePr, spiritualPr };
}

function diagonalPositions(cardNumber, offset) {
  if (!POSITION[cardNumber]) return [];
  const [i, j] = POSITION[cardNumber];
  const out = [];
  for (const di of [-offset, offset]) {
    for (const dj of [-offset, offset]) {
      const r = i + di, c = j + dj;
      if (r >= 0 && r < 8 && c >= 0 && c < 7 && DECK_ARRAY[r][c] !== -1) out.push([r, c]);
    }
  }
  return out;
}
const diagonalElements = (n, offset, deck) =>
  diagonalPositions(n, offset).map(([r, c]) => deck[DECK_ARRAY[r][c]]);

const FIXED_AND_SEMIFIXED = [11, 21, 52, 2, 14, 9, 33];
const fixedPartners = (n) =>
  FIXED_AND_SEMIFIXED.includes(n)
    ? FIXED_AND_SEMIFIXED.filter((x) => x !== n).map((x) => SPIRITUAL_DECK[x])
    : [];

const karmaCards = (name) => ({
  karmaBirth: LIFE_DECK[SPIRITUAL_INDEX[name]],
  karmaLife: SPIRITUAL_DECK[LIFE_INDEX[name]],
});

const LIFE_PATH_MATRIX = [[1, 5, 7], [2, 4, 8], [3, 6, 9]];
const LIFE_COMPAT_ARRAY = [[3, 9], [3, 6], [1, 2, 5], [6, 7], [3, 9], [2, 4, 8], [4], [6], [1, 5]];
const digits = (s) => String(s).split("").reduce((a, c) => a + +c, 0);
function reduceNum(n) { while (n > 9) n = digits(n); return n; }
const lifePathNumber = (m, d, y) =>
  reduceNum(m + digits(String(d).padStart(2, "0")) + digits(y));

function lifePathCompatible(a, b) {
  for (const row of LIFE_PATH_MATRIX) if (row.includes(a) && row.includes(b)) return "natural";
  if (LIFE_COMPAT_ARRAY[a - 1].includes(b) || LIFE_COMPAT_ARRAY[b - 1].includes(a)) return "lesser";
  return null;
}

function forecast(m, d, y, business) {
  const offset = business ? 4 : 2;
  const n = birthCardNumber(m, d, y);
  const birthCard = SPIRITUAL_DECK[n];
  const pr = planetaryRulingCards(birthCard, m, d);

  // Appendix B labels Dec 31 JOKER: index 0 sits in neither spread.
  if (birthCard === JOKER) {
    return { month: m, day: d, year: y, birthCard: JOKER, birthCardNumber: 0,
      signs: pr.signs, rulers: [], prc: [], karma: [],
      lifePath: lifePathNumber(m, d, y), kindred: [], offset };
  }

  const prcNames = pr.lifePr;

  let list = [];
  list = list.concat(diagonalElements(n, offset, SPIRITUAL_DECK));
  if (!business) list = list.concat(fixedPartners(n));
  list = list.concat(diagonalElements(LIFE_INDEX[birthCard], offset, LIFE_DECK));

  for (const prc of prcNames) {
    list = list.concat(diagonalElements(LIFE_INDEX[prc], offset, LIFE_DECK));
    if (!business) list = list.concat(fixedPartners(SPIRITUAL_INDEX[prc]));
    list = list.concat(diagonalElements(SPIRITUAL_INDEX[prc], offset, SPIRITUAL_DECK));
  }

  const km = karmaCards(birthCard);
  let karma = [km.karmaBirth, km.karmaLife];
  for (const prc of prcNames) {
    const k = karmaCards(prc);
    karma = karma.concat([k.karmaBirth, k.karmaLife]);
  }
  if (!business) list = list.concat(karma);
  for (const k of karma) {
    list = list.concat(diagonalElements(SPIRITUAL_INDEX[k], offset, SPIRITUAL_DECK));
    list = list.concat(diagonalElements(LIFE_INDEX[k], offset, LIFE_DECK));
  }

  const excluded = new Set([birthCard, ...prcNames]);
  const seen = new Set(), kindred = [];
  for (const c of list) {
    if (c && !excluded.has(c) && !seen.has(c)) { seen.add(c); kindred.push(c); }
  }

  return {
    month: m, day: d, year: y, birthCard, birthCardNumber: n,
    signs: pr.signs, rulers: pr.rulers, prc: prcNames,
    karma: Array.from(new Set(karma)),
    lifePath: lifePathNumber(m, d, y), kindred, offset,
  };
}

function compare(a, b) {
  const aT = new Set([a.birthCard, ...a.prc]);
  const bT = new Set([b.birthCard, ...b.prc]);
  return {
    aMatches: a.kindred.filter((c) => bT.has(c)),
    bMatches: b.kindred.filter((c) => aT.has(c)),
    lifePath: lifePathCompatible(a.lifePath, b.lifePath),
  };
}

export {
  forecast, compare, birthCardNumber, planetaryRulingCards, zodiacSigns,
  lifePathNumber, lifePathCompatible, diagonalPositions, parts,
  SPIRITUAL_DECK, LIFE_DECK, SPIRITUAL_INDEX, LIFE_INDEX,
  DECK_ARRAY, SUIT_GLYPH, JOKER,
};
