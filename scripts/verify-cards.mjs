/**
 * Card art verification. Runs under npm test.
 *
 * The failure this guards against is a wrong file under a right name, so a
 * count is not enough. Every face is checked against the engine four
 * independent ways: the upstream file name it was imported from, the rank its
 * own corner indices print, the colour they print it in, and the suit symbol
 * it draws. Each file must
 * also be byte-identical to what the manifest records, distinct from every
 * other face, and free of anything executable, because it is served publicly
 * with the app. The cards table migration is held to the same names and colours.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { SPIRITUAL_DECK, JOKER, parts } from "../engine/kindredEngine.js";
import { BACK_CODE, CARD_ART_VERSION, JOKER_CODE, cardCode } from "../src/lib/cardArt.js";
import { renderContactSheet } from "./card-contact-sheet.mjs";

const ROOT = new URL("../public/card-art/", import.meta.url);
const DIR = new URL(`${CARD_ART_VERSION}/`, ROOT);
const MIGRATIONS = new URL("../supabase/migrations/", import.meta.url);

const manifest = JSON.parse(readFileSync(new URL("manifest.json", ROOT), "utf8"));
const engineNames = [...new Set(Object.values(SPIRITUAL_DECK))];
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const bytesOf = (file) => readFileSync(new URL(file, ROOT));
const isRedSuit = (suit) => suit === "Hearts" || suit === "Diamonds";

// The upstream deck prints red indices in #df0000 and black in #000000.
const INK = { red: "#df0000", black: "#000000" };

const RANK_WORD = { ace: "A", jack: "J", queen: "Q", king: "K" };
const SUIT_WORD = { hearts: "Hearts", clubs: "Clubs", diamonds: "Diamonds", spades: "Spades" };

/** What an upstream file name says it is. */
function readUpstreamName(file) {
  const joker = /^(black|red)_joker\.svg$/.exec(file);
  if (joker) return { joker: true, red: joker[1] === "red" };
  const card = /^(ace|[2-9]|10|jack|queen|king)_of_(hearts|clubs|diamonds|spades)2?\.svg$/.exec(file);
  if (!card) return null;
  return { joker: false, rank: RANK_WORD[card[1]] ?? card[1], suit: SUIT_WORD[card[2]] };
}

/** What an SVG actually prints in its text: the characters and their fill colours. */
function readIndices(source) {
  const elements = source.match(/<text\b[\s\S]*?<\/text>/g) ?? [];
  const text = elements.map((t) => t.replace(/<[^>]+>/g, "").replace(/\s+/g, "")).join("");
  const fills = new Set(elements.flatMap((t) =>
    [...t.matchAll(/fill\s*:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1].toLowerCase())));
  return { text, fills: [...fills] };
}

/** Rows of the generated cards migration. */
function cardsTableRows() {
  const file = readdirSync(MIGRATIONS).find((f) => /_cards\.sql$/.test(f));
  assert.ok(file, "the cards migration exists");
  const sql = readFileSync(new URL(file, MIGRATIONS), "utf8");
  const row = /^\s*\('([^']+)', '([^']+)', '([^']+)', (null|'[^']+'), (true|false), '([^']+)'\)[,;]$/gm;
  return [...sql.matchAll(row)].map((m) => ({
    code: m[1], name: m[2], rank: m[3], suit: m[4] === "null" ? null : m[4].slice(1, -1),
    isRed: m[5] === "true", imagePath: m[6],
  }));
}

const entries = manifest.cards;
const byCode = new Map(entries.map((e) => [e.code, e]));

test("the engine produces 52 cards and the Joker, each with a code", () => {
  assert.equal(engineNames.length, 53);
  assert.ok(engineNames.includes(JOKER));
  const codes = engineNames.map(cardCode);
  assert.ok(codes.every(Boolean), "every engine name has a code");
  assert.equal(new Set(codes).size, 53, "no two engine names share a code");
});

test("every card name the engine can produce resolves to exactly one asset", () => {
  for (const name of engineNames) {
    const code = cardCode(name);
    const matches = entries.filter((e) => e.code === code);
    assert.equal(matches.length, 1, `${name} (${code}) has exactly one manifest entry`);
    assert.equal(matches[0].file, `${CARD_ART_VERSION}/${code}.svg`, `${code} lives at its versioned path`);
    assert.ok(bytesOf(matches[0].file).length > 0, `${code}.svg exists`);
  }
});

test("every asset maps back to exactly one engine name, with nothing extra on disk", () => {
  const engineByCode = new Map(engineNames.map((n) => [cardCode(n), n]));
  assert.equal(entries.length, 53, "53 faces in the manifest");
  assert.equal(byCode.size, entries.length, "no duplicate codes in the manifest");
  for (const e of entries) assert.ok(engineByCode.has(e.code), `${e.code} is a card the engine produces`);

  const expected = new Set([...entries.map((e) => `${e.code}.svg`), `${BACK_CODE}.svg`]);
  const onDisk = new Set(readdirSync(DIR));
  assert.deepEqual([...onDisk].filter((f) => !expected.has(f)), [], "no unlisted files");
  assert.deepEqual([...expected].filter((f) => !onDisk.has(f)), [], "no missing files");
});

test("each face is byte-identical to the upstream file its manifest names, and all are distinct", () => {
  const hashes = new Set();
  for (const e of entries) {
    const hash = sha256(bytesOf(e.file));
    assert.equal(hash, e.sha256, `${e.code}.svg matches the recorded hash of ${e.upstream}`);
    assert.ok(!hashes.has(hash), `${e.code}.svg is not a copy of another face`);
    hashes.add(hash);
  }
  const uploads = new Set(entries.map((e) => e.upstream));
  assert.equal(uploads.size, entries.length, "no upstream file is used twice");
});

test("each face's upstream file name names the same card", () => {
  for (const name of engineNames.filter((n) => n !== JOKER)) {
    const e = byCode.get(cardCode(name));
    const said = readUpstreamName(e.upstream);
    const p = parts(name);
    assert.ok(said && !said.joker, `${e.upstream} is a suited card`);
    assert.deepEqual({ rank: said.rank, suit: said.suit }, { rank: p.rank, suit: p.suit },
      `${e.upstream} is the ${name}`);
  }
});

test("each face prints its own rank in its corner indices", () => {
  for (const name of engineNames.filter((n) => n !== JOKER)) {
    const e = byCode.get(cardCode(name));
    const { text } = readIndices(bytesOf(e.file).toString("utf8"));
    assert.equal(text, parts(name).rank.repeat(2), `${e.code}.svg prints "${parts(name).rank}" in both corners`);
  }
});

// The corner suit symbol, fingerprinted from the upstream deck: each of these
// path shapes is drawn on every card of its suit, courts included, and on no
// card of any other suit. It is what catches a hearts/diamonds or clubs/spades
// swap, which rank and colour alone cannot.
const SUIT_MARK = {
  Hearts: "612ca1b37f1968a9",
  Clubs: "21617de135862116",
  Diamonds: "ae9b733f9426c388",
  Spades: "cd943049ba3059a5",
};
const shapesOf = (source) => new Set([...source.matchAll(/\sd="([^"]+)"/g)]
  .map((m) => sha256(m[1].replace(/\s+/g, " ").trim()).slice(0, 16)));

test("each face draws its own suit's symbol and no other suit's", () => {
  for (const name of engineNames.filter((n) => n !== JOKER)) {
    const e = byCode.get(cardCode(name));
    const shapes = shapesOf(bytesOf(e.file).toString("utf8"));
    const drawn = Object.entries(SUIT_MARK).filter(([, mark]) => shapes.has(mark)).map(([suit]) => suit);
    assert.deepEqual(drawn, [parts(name).suit], `${e.code}.svg draws the ${parts(name).suit} symbol and no other`);
  }
});

test("is_red matches the suit in the engine, in each face's ink and in the cards table", () => {
  for (const name of engineNames.filter((n) => n !== JOKER)) {
    const p = parts(name);
    assert.equal(p.red, isRedSuit(p.suit), `the engine colours the ${name} by its suit`);
    const e = byCode.get(cardCode(name));
    const { fills } = readIndices(bytesOf(e.file).toString("utf8"));
    assert.deepEqual(fills, [p.red ? INK.red : INK.black], `${e.code}.svg prints its indices in ${p.red ? "red" : "black"}`);
  }

  const rows = cardsTableRows();
  assert.equal(rows.length, 53, "the cards table has 53 rows");
  for (const row of rows) {
    const e = byCode.get(row.code);
    assert.ok(e, `table row ${row.code} has art`);
    assert.equal(cardCode(row.name), row.code, `table row ${row.code} carries the engine's name`);
    assert.equal(row.isRed, isRedSuit(row.suit), `table row ${row.code} is_red matches its suit`);
    assert.equal(row.imagePath, e.file, `table row ${row.code} points at its face`);
  }
});

test("the Joker is its own case everywhere", () => {
  assert.equal(cardCode(JOKER), JOKER_CODE);
  const p = parts(JOKER);
  assert.equal(p.suit, null, "the engine's Joker has no suit");
  assert.equal(p.red, false, "the engine's Joker is not red");

  const e = byCode.get(JOKER_CODE);
  assert.deepEqual(readUpstreamName(e.upstream), { joker: true, red: false }, `${e.upstream} is the black Joker`);
  const { text, fills } = readIndices(bytesOf(e.file).toString("utf8"));
  assert.equal(text, "JokerJoker", "the Joker prints its name in both corners");
  assert.deepEqual(fills, [INK.black], "the Joker's name is printed in black");

  const row = cardsTableRows().find((r) => r.code === JOKER_CODE);
  assert.deepEqual({ name: row.name, suit: row.suit, isRed: row.isRed }, { name: JOKER, suit: null, isRed: false });
});

test("no face and not the back carries anything that could run or fetch", () => {
  const forbidden = [/<script/i, /\son[a-z]+\s*=/i, /javascript:/i, /<foreignObject/i, /<image\b/i,
    /(?:xlink:)?href\s*=\s*["'](?!#)/i, /url\(\s*["']?(?!#)/i];
  for (const item of [...entries, manifest.back]) {
    const source = bytesOf(item.file).toString("utf8");
    for (const pattern of forbidden) assert.doesNotMatch(source, pattern, `${item.file} has no ${pattern}`);
  }
});

test("the back is present and matches the manifest", () => {
  assert.equal(manifest.back.file, `${CARD_ART_VERSION}/${BACK_CODE}.svg`);
  assert.equal(sha256(bytesOf(manifest.back.file)), manifest.back.sha256);
});

test("the contact sheet is current", () => {
  const onDisk = readFileSync(new URL("card-contact-sheet.html", import.meta.url), "utf8");
  assert.equal(onDisk, renderContactSheet(), "rerun node scripts/card-contact-sheet.mjs");
});
