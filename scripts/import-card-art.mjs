/**
 * Imports card faces from Byron Knoll's SVG release into assets/card-art/.
 *
 *   node scripts/import-card-art.mjs path/to/SVG-cards-1.3.zip
 *
 * Refuses a zip whose sha256 is not the one recorded below. Picks one upstream
 * file for every card name the engine produces, copies it byte for byte to
 * assets/card-art/v1/{code}.svg, and writes manifest.json recording which
 * upstream file became which code and the hash of each. verify-cards.mjs
 * checks the result; this script only needs to run again for new art.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { SPIRITUAL_DECK, JOKER, parts } from "../engine/kindredEngine.js";
import { BACK_CODE, CARD_ART_VERSION, cardCode } from "../src/lib/cardArt.js";

export const SOURCE = {
  name: "Vector Playing Cards 1.3 (SVG)",
  author: "Byron Knoll",
  license: "Public domain",
  licenseEvidence:
    "https://code.google.com/archive/p/vector-playing-cards/ — the author's project page: "
    + "\"These images are released into the public domain - attribution is appreciated but not required.\"",
  download:
    "https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/vector-playing-cards/SVG-cards-1.3.zip",
  sha256: "b82309c8d82e198c2002b9b72a31de807a581386d2134a88199ac121c3d178e3",
};

const DIR = new URL(`../assets/card-art/${CARD_ART_VERSION}/`, import.meta.url);
const MANIFEST = new URL("../assets/card-art/manifest.json", import.meta.url);
const RANK_WORD = { A: "ace", J: "jack", Q: "queen", K: "king" };
const COURTS = new Set(["J", "Q", "K"]);

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/**
 * The upstream file for an engine card name. Courts use the illustrated "2"
 * variants; aces and numbers have one design each. The engine's Joker is not
 * red, so it takes the black Joker.
 */
export function upstreamFileFor(name) {
  if (name === JOKER) return "black_joker.svg";
  const p = parts(name);
  const rank = RANK_WORD[p.rank] ?? p.rank;
  return `${rank}_of_${p.suit.toLowerCase()}${COURTS.has(p.rank) ? "2" : ""}.svg`;
}

function main(zip) {
  if (!zip) throw new Error("usage: node scripts/import-card-art.mjs path/to/SVG-cards-1.3.zip");
  const zipHash = sha256(readFileSync(zip));
  if (zipHash !== SOURCE.sha256) throw new Error(`zip sha256 is ${zipHash}, expected ${SOURCE.sha256}`);

  const entries = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" }).split("\n").filter(Boolean);
  const byBase = new Map(entries.filter((e) => e.endsWith(".svg")).map((e) => [basename(e), e]));

  mkdirSync(DIR, { recursive: true });
  for (const f of readdirSync(DIR)) if (f !== `${BACK_CODE}.svg`) rmSync(new URL(f, DIR));

  const names = [...new Set(Object.values(SPIRITUAL_DECK))];
  const cards = names.map((name) => {
    const code = cardCode(name);
    const upstream = upstreamFileFor(name);
    const entry = byBase.get(upstream);
    if (!entry) throw new Error(`${upstream} (for ${name}) is not in the zip`);
    const bytes = execFileSync("unzip", ["-p", zip, entry], { maxBuffer: 16 * 1024 * 1024 });
    writeFileSync(new URL(`${code}.svg`, DIR), bytes);
    return { code, file: `${CARD_ART_VERSION}/${code}.svg`, upstream, sha256: sha256(bytes) };
  }).sort((a, b) => a.code.localeCompare(b.code, "en"));

  const back = readFileSync(new URL(`${BACK_CODE}.svg`, DIR));
  const manifest = {
    version: CARD_ART_VERSION,
    source: SOURCE,
    cards,
    back: {
      code: BACK_CODE,
      file: `${CARD_ART_VERSION}/${BACK_CODE}.svg`,
      upstream: null,
      origin: "Drawn for this repo from the .card-back rule in src/theme.js; not from the upstream deck.",
      sha256: sha256(back),
    },
  };
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`card art: imported ${cards.length} faces from ${SOURCE.name}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv[2]);
