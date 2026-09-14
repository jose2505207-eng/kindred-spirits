import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  forecast, compare, birthCardNumber, planetaryRulingCards,
  SPIRITUAL_DECK, LIFE_DECK, JOKER,
} from "./kindredEngine.js";

const RANKS = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Jack", "Queen", "King"];
const SHORT = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const expand = (s) => s === JOKER ? JOKER :
  `${RANKS[SHORT.indexOf(s.slice(0, -1))]} of ` +
  { H: "Hearts", C: "Clubs", D: "Diamonds", S: "Spades" }[s.slice(-1)];

const chart = JSON.parse(readFileSync(new URL("./fixtures/appendix-b.json", import.meta.url)));
const ref = JSON.parse(readFileSync(new URL("./fixtures/reference-1990.json", import.meta.url)));

/* --------------------------------------------------------------------------
   The chart is the ground truth. If one of these fails, the engine is wrong,
   not the fixture.
   -------------------------------------------------------------------------- */

test("birth cards match the Appendix B chart", () => {
  for (const row of chart.rows) {
    const got = SPIRITUAL_DECK[birthCardNumber(row.month, row.day, 1961)];
    assert.equal(got, expand(row.birthCard), `${row.month}/${row.day}`);
  }
});

test("planetary ruling cards match the Appendix B chart", () => {
  for (const row of chart.rows) {
    if (!row.prc) continue;
    const bc = SPIRITUAL_DECK[birthCardNumber(row.month, row.day, 1961)];
    const pr = planetaryRulingCards(bc, row.month, row.day);
    assert.equal(pr.lifePr[0], expand(row.prc), `${row.month}/${row.day}`);
  }
});

test("Feb 17 rounds up — the truncation trap", () => {
  // 33.964. A Swift Int() cast would give 33, the Seven of Diamonds.
  // Appendix B shows the Eight. This is the single easiest bug to reintroduce.
  assert.equal(birthCardNumber(2, 17, 1963), 34);
  assert.equal(SPIRITUAL_DECK[34], "Eight of Diamonds");
});

test("Dec 31 is the Joker and yields an empty reading", () => {
  const f = forecast(12, 31, 1990, false);
  assert.equal(f.birthCard, JOKER);
  assert.deepEqual(f.prc, []);
  assert.deepEqual(f.kindred, []);
});

test("the Life Spread deck is a complete 52-card deck", () => {
  const names = Object.entries(LIFE_DECK).filter(([n]) => +n).map(([, v]) => v);
  assert.equal(names.length, 52);
  assert.equal(new Set(names).size, 52);
  // Fixed cards hold position; the two semi-fixed pairs swap.
  for (const n of [11, 21, 52]) assert.equal(LIFE_DECK[n], SPIRITUAL_DECK[n]);
  assert.equal(LIFE_DECK[2], SPIRITUAL_DECK[14]);
  assert.equal(LIFE_DECK[14], SPIRITUAL_DECK[2]);
  assert.equal(LIFE_DECK[9], SPIRITUAL_DECK[33]);
  assert.equal(LIFE_DECK[33], SPIRITUAL_DECK[9]);
});

/* --------------------------------------------------------------------------
   Worked examples printed in the disclosure.
   -------------------------------------------------------------------------- */

const EXAMPLES = [
  [5, 31, 1961, "Ace of Clubs", "Queen of Clubs", "Gemini", 8],
  [1, 25, 1971, "Two of Diamonds", "Ten of Diamonds", "Aquarius", 8],
  [2, 17, 1963, "Eight of Diamonds", "Five of Clubs", "Aquarius", 2],
  [12, 29, 1981, "Two of Hearts", "Two of Diamonds", "Capricorn", 6],
  [11, 28, 1989, "Five of Hearts", "Seven of Clubs", "Sagittarius", 3],
];

test("the disclosure's five worked examples", () => {
  for (const [m, d, y, bc, prc, sign, lp] of EXAMPLES) {
    const f = forecast(m, d, y, false);
    assert.equal(f.birthCard, bc, `${m}/${d}/${y} birth card`);
    assert.deepEqual(f.prc, [prc], `${m}/${d}/${y} ruling card`);
    assert.deepEqual(f.signs, [sign], `${m}/${d}/${y} sign`);
    assert.equal(f.lifePath, lp, `${m}/${d}/${y} life path`);
  }
});

test("example 1 compatibility: May 31 1961 and Jan 25 1971", () => {
  const c = compare(forecast(5, 31, 1961, false), forecast(1, 25, 1971, false));
  assert.equal(c.lifePath, "natural");
  assert.ok(c.aMatches.length > 0 && c.bMatches.length > 0);
});

test("example 4 is a rejection: May 31 1961 and Nov 28 1989", () => {
  const c = compare(forecast(5, 31, 1961, false), forecast(11, 28, 1989, false));
  assert.deepEqual(c.aMatches, []);
  assert.deepEqual(c.bMatches, []);
  assert.equal(c.lifePath, null);
});

/* --------------------------------------------------------------------------
   Parity with engine/kindred_spirits.py across every date, both connections.
   Regression only: it locks in current behaviour, it does not prove it right.
   -------------------------------------------------------------------------- */

test("parity with the Python reference across the full year", () => {
  for (const row of ref.rows) {
    const f = forecast(row.month, row.day, ref.year, row.business);
    const label = `${row.month}/${row.day} ${row.business ? "business" : "love"}`;
    assert.equal(f.birthCard, row.birthCard, label);
    assert.deepEqual(f.prc, row.prc, label);
    assert.deepEqual(f.signs, row.signs, label);
    assert.equal(f.lifePath, row.lifePath, label);
    assert.deepEqual([...f.kindred].sort(), row.kindred, label);
  }
});

test("every date of the year produces a reading without throwing", () => {
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= 31; d++) {
      if (new Date(1990, m - 1, d).getMonth() !== m - 1) continue;
      assert.doesNotThrow(() => forecast(m, d, 1990, false), `${m}/${d}`);
      assert.doesNotThrow(() => forecast(m, d, 1990, true), `${m}/${d}`);
    }
  }
});
