import React, { useState, useMemo } from "react";

/* ==========================================================================
   ENGINE — port of kindred_spirits.py. Pure functions, no React.
   Lift this whole block into kindredEngine.js unchanged for React Native.
   ========================================================================== */

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

/* ==========================================================================
   UI
   ========================================================================== */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,600;6..96,800&family=Inter:wght@400;500;600&display=swap');

.ks { --felt:#0E241C; --felt-2:#081713; --felt-3:#16342A;
  --ivory:#F3EEE2; --ink:#16140F; --red:#BE1C2D; --brass:#C6A03C; --mute:#87A196;
  background:var(--felt); color:var(--ivory);
  font-family:Inter,system-ui,sans-serif; min-height:100%;
  padding:20px 16px 56px; max-width:520px; margin:0 auto; }
.ks *{box-sizing:border-box}
.ks-mark{font-family:'Bodoni Moda',Georgia,serif; font-size:26px; font-weight:800;
  letter-spacing:-.01em; line-height:1.05; margin:0 0 2px}
.ks-sub{color:var(--mute); font-size:13px; margin:0 0 22px; line-height:1.5}

.ks-field{display:block; margin-bottom:12px}
.ks-field span{display:block; font-size:13px; color:var(--mute); margin-bottom:6px}
.ks-field input{width:100%; padding:12px 13px; border-radius:3px; font-size:16px;
  font-family:inherit; background:var(--felt-2); color:var(--ivory);
  border:1px solid var(--felt-3); }
.ks-field input:focus{outline:2px solid var(--brass); outline-offset:1px}

.ks-seg{display:flex; gap:0; border:1px solid var(--felt-3); border-radius:3px;
  overflow:hidden; margin:16px 0}
.ks-seg button{flex:1; padding:11px 8px; background:var(--felt-2); color:var(--mute);
  border:0; font:inherit; font-size:13px; cursor:pointer; line-height:1.35}
.ks-seg button b{display:block; color:var(--ivory); font-weight:600; font-size:14px}
.ks-seg button[aria-pressed="true"]{background:var(--felt-3); color:var(--ivory)}
.ks-seg button[aria-pressed="true"] b{color:var(--brass)}

.ks-go{width:100%; padding:14px; border:0; border-radius:3px; cursor:pointer;
  background:var(--brass); color:#1B1503; font:inherit; font-weight:600; font-size:15px}
.ks-go:disabled{opacity:.4; cursor:not-allowed}

.ks-rule{border:0; border-top:1px solid var(--felt-3); margin:30px 0 22px}
.ks-h{font-family:'Bodoni Moda',Georgia,serif; font-size:19px; font-weight:600;
  margin:0 0 12px}
.ks-note{color:var(--mute); font-size:13px; line-height:1.55; margin:0 0 14px}

/* card faces */
.card{background:var(--ivory); color:var(--ink); border-radius:5px;
  position:relative; display:flex; align-items:center; justify-content:center;
  font-family:'Bodoni Moda',Georgia,serif; box-shadow:0 2px 0 rgba(0,0,0,.35)}
.card.red{color:var(--red)}
.card .idx{position:absolute; top:5px; left:6px; font-size:13px; font-weight:600;
  line-height:1; text-align:center}
.card .idx i{display:block; font-style:normal; font-size:11px}
.card .pip{font-size:40px; line-height:1}
.card-lg{width:104px; height:146px; flex:none}
.card-lg .pip{font-size:58px}
.card-lg .idx{font-size:18px; top:7px; left:8px}
.card-lg .idx i{font-size:15px}

.flip{perspective:900px}
.flip-in{animation:turn .55s cubic-bezier(.3,.8,.4,1) both}
@keyframes turn{from{transform:rotateY(90deg)}to{transform:rotateY(0)}}
@media (prefers-reduced-motion:reduce){.flip-in{animation:none}}

.hero{display:flex; gap:18px; align-items:center}
.hero dl{margin:0; font-size:13px; line-height:1.6}
.hero dt{color:var(--mute)}
.hero dd{margin:0 0 9px; font-size:15px; font-weight:500}
.hero .big{font-family:'Bodoni Moda',Georgia,serif; font-size:24px; font-weight:600;
  line-height:1.15; margin-bottom:11px}

/* the spread */
.spread{display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:10px}
.cell{aspect-ratio:5/7; border-radius:3px; background:var(--felt-2);
  border:1px solid var(--felt-3); display:flex; align-items:center;
  justify-content:center; font-family:'Bodoni Moda',Georgia,serif;
  font-size:11px; font-weight:600; color:#4E6B60; padding:1px}
.cell.void{background:transparent; border-color:transparent}
.cell.diag{background:var(--felt-3); border-color:var(--brass); color:var(--ivory)}
.cell.prc{background:#332910; border-color:var(--brass); color:var(--brass)}
.cell.self{background:var(--ivory); border-color:var(--ivory); color:var(--ink);
  font-size:12px; font-weight:800}
.cell.self.red,.cell.diag.red,.cell.prc.red{}
.cell.self.isred{color:var(--red)}

.legend{display:flex; flex-wrap:wrap; gap:12px; font-size:12px; color:var(--mute);
  margin-bottom:6px}
.legend i{display:inline-block; width:9px; height:9px; border-radius:2px;
  margin-right:5px; vertical-align:middle}

.chips{display:grid; grid-template-columns:repeat(auto-fill,minmax(46px,1fr)); gap:6px}
.chip{aspect-ratio:5/7; font-size:13px}
.chip .pip{font-size:17px}
.chip .idx{font-size:10px; top:3px; left:4px}
.chip .idx i{font-size:9px}

.verdict{border:1px solid var(--felt-3); border-left:3px solid var(--brass);
  border-radius:3px; padding:14px 15px; background:var(--felt-2)}
.verdict h3{font-family:'Bodoni Moda',Georgia,serif; font-size:17px; margin:0 0 7px}
.verdict p{margin:0 0 8px; font-size:13.5px; line-height:1.6; color:#CFE0D7}
.verdict p:last-child{margin-bottom:0}
.verdict b{color:var(--brass); font-weight:600}
`;

function Card({ name, size = "chip" }) {
  const p = parts(name);
  if (!p.suit) {
    return <div className={`card ${size === "lg" ? "card-lg" : "chip"}`}><span className="pip">★</span></div>;
  }
  return (
    <div className={`card ${p.red ? "red" : ""} ${size === "lg" ? "card-lg" : "chip"}`}>
      <span className="idx">{p.rank}<i>{SUIT_GLYPH[p.suit]}</i></span>
      <span className="pip">{SUIT_GLYPH[p.suit]}</span>
    </div>
  );
}

function Spread({ deck, fc, which }) {
  const index = which === "life" ? LIFE_INDEX : SPIRITUAL_INDEX;
  const selfN = index[fc.birthCard];
  const diag = new Set(diagonalPositions(selfN, fc.offset).map((p) => p.join(",")));
  const prcSet = new Set(fc.prc.map((c) => index[c]));

  return (
    <div className="spread">
      {DECK_ARRAY.map((row, i) => row.map((v, j) => {
        if (v === -1) return <div key={`${i}-${j}`} className="cell void" />;
        const name = deck[v];
        const p = parts(name);
        let cls = "cell";
        if (v === selfN) cls += " self" + (p.red ? " isred" : "");
        else if (prcSet.has(v)) cls += " prc";
        else if (diag.has(`${i},${j}`)) cls += " diag";
        return (
          <div key={`${i}-${j}`} className={cls} title={name}>
            {p.rank}{SUIT_GLYPH[p.suit]}
          </div>
        );
      }))}
    </div>
  );
}

function Reading({ fc, which, setWhich }) {
  const deck = which === "life" ? LIFE_DECK : SPIRITUAL_DECK;
  const ruler = fc.rulers.map((r) => r.planet).join(" and ");
  return (
    <>
      <div className="hero flip">
        <div className="flip-in"><Card name={fc.birthCard} size="lg" /></div>
        <dl>
          <div className="big">{fc.birthCard}</div>
          <dt>Ruling card</dt>
          <dd>{fc.prc.join(" · ")}</dd>
          <dt>Sign</dt>
          <dd>{fc.signs.join(" / ")}{fc.signs.length > 1 ? " (cusp)" : ""} · {ruler}</dd>
          <dt>Life path</dt>
          <dd>{fc.lifePath}</dd>
        </dl>
      </div>

      <hr className="ks-rule" />
      <h2 className="ks-h">Where you sit in the spread</h2>
      <div className="ks-seg" role="group" aria-label="Which spread">
        <button aria-pressed={which === "spiritual"} onClick={() => setWhich("spiritual")}>
          <b>Spiritual spread</b>the base deck
        </button>
        <button aria-pressed={which === "life"} onClick={() => setWhich("life")}>
          <b>Life spread</b>the complement
        </button>
      </div>
      <Spread deck={deck} fc={fc} which={which} />
      <div className="legend">
        <span><i style={{ background: "var(--ivory)" }} />your card</span>
        <span><i style={{ background: "var(--felt-3)", border: "1px solid var(--brass)" }} />
          {fc.offset === 2 ? "Venus" : "Jupiter"} diagonals</span>
        <span><i style={{ background: "#332910", border: "1px solid var(--brass)" }} />ruling card</span>
      </div>
      <p className="ks-note">
        Your matches sit {fc.offset} positions away on the diagonal — the{" "}
        {fc.offset === 2 ? "Venus offset, which the disclosure ties to friendship and love"
          : "Jupiter offset, which the disclosure ties to business"}.
      </p>

      <hr className="ks-rule" />
      <h2 className="ks-h">Kindred spirits ({fc.kindred.length})</h2>
      <p className="ks-note">
        Anyone born on a day that maps to one of these cards is a candidate match.
      </p>
      <div className="chips">
        {fc.kindred.map((c) => <Card key={c} name={c} />)}
      </div>
    </>
  );
}

function Verdict({ a, b, cmp, business }) {
  const cardHits = [...new Set([...cmp.aMatches, ...cmp.bMatches])];
  const lp = cmp.lifePath;
  let headline;
  if (cardHits.length >= 2 && lp === "natural") headline = "A natural fit";
  else if (cardHits.length && lp) headline = "Strongly compatible";
  else if (cardHits.length || lp) headline = "Marginally compatible";
  else headline = "A challenging match";

  return (
    <div className="verdict">
      <h3>{headline}</h3>
      <p>
        {cardHits.length
          ? <>Card matches: <b>{cardHits.join(", ")}</b>. {b.birthCard} appears in the first
            reading{cmp.bMatches.length ? ", and the reverse holds too" : ""}.</>
          : <>Neither birth card nor ruling card appears in the other's list.</>}
      </p>
      <p>
        Life path {a.lifePath} and {b.lifePath}:{" "}
        {lp === "natural" ? <b>same row of the Pythagorean matrix</b>
          : lp === "lesser" ? <b>compatible to a lesser extent</b>
            : <>no match</>}.
      </p>
      <p>
        {headline === "A challenging match"
          ? "Expect to compromise a great deal."
          : business
            ? "Read as a business connection — minimal compromise, good financial footing."
            : "Read as a friendship or love connection."}
      </p>
    </div>
  );
}

export default function KindredSpirits() {
  const [dateA, setDateA] = useState("1961-05-31");
  const [dateB, setDateB] = useState("");
  const [business, setBusiness] = useState(false);
  const [which, setWhich] = useState("spiritual");
  const [run, setRun] = useState(null);

  const parse = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return y && m && d ? [m, d, y] : null;
  };

  const result = useMemo(() => {
    if (!run) return null;
    const a = parse(run.a);
    if (!a) return null;
    const fa = forecast(a[0], a[1], a[2], run.business);
    const b = run.b ? parse(run.b) : null;
    const fb = b ? forecast(b[0], b[1], b[2], run.business) : null;
    return { fa, fb, cmp: fb ? compare(fa, fb) : null };
  }, [run]);

  return (
    <div className="ks">
      <style>{CSS}</style>

      <h1 className="ks-mark">Kindred Spirits</h1>
      <p className="ks-sub">
        Your birthdate maps to one card in a 52-card spread. The cards sitting on its
        diagonals are the people you are drawn to.
      </p>

      <label className="ks-field">
        <span>Your birthdate</span>
        <input type="date" value={dateA} onChange={(e) => setDateA(e.target.value)} />
      </label>
      <label className="ks-field">
        <span>Theirs — optional, for a compatibility reading</span>
        <input type="date" value={dateB} onChange={(e) => setDateB(e.target.value)} />
      </label>

      <div className="ks-seg" role="group" aria-label="Kind of connection">
        <button aria-pressed={!business} onClick={() => setBusiness(false)}>
          <b>Love</b>Venus offset of two
        </button>
        <button aria-pressed={business} onClick={() => setBusiness(true)}>
          <b>Business</b>Jupiter offset of four
        </button>
      </div>

      <button
        className="ks-go"
        disabled={!parse(dateA)}
        onClick={() => setRun({ a: dateA, b: dateB, business, k: Date.now() })}
      >
        Read the cards
      </button>

      {result && (
        <>
          <hr className="ks-rule" />
          {result.cmp && (
            <>
              <Verdict a={result.fa} b={result.fb} cmp={result.cmp} business={run.business} />
              <hr className="ks-rule" />
            </>
          )}
          <Reading key={run.k} fc={result.fa} which={which} setWhich={setWhich} />
          {result.fb && (
            <>
              <hr className="ks-rule" />
              <h2 className="ks-h">Their reading</h2>
              <div className="hero">
                <Card name={result.fb.birthCard} size="lg" />
                <dl>
                  <div className="big">{result.fb.birthCard}</div>
                  <dt>Ruling card</dt>
                  <dd>{result.fb.prc.join(" · ")}</dd>
                  <dt>Sign</dt>
                  <dd>{result.fb.signs.join(" / ")}</dd>
                  <dt>Life path</dt>
                  <dd>{result.fb.lifePath}</dd>
                </dl>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
