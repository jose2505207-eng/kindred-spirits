/**
 * Uploads assets/card-art/ to the public card-art bucket, then fetches every
 * object back over its public URL and compares it byte for byte with the
 * manifest.
 *
 *   node --env-file=.env.upload scripts/upload-card-art.mjs
 *
 * Needs SUPABASE_URL and SUPABASE_SECRET_KEY. The secret key bypasses RLS: keep
 * it in an untracked file or your shell, and never in a VITE_ variable, which
 * Vite would bundle into the app. The bucket has no client write policies, so
 * this is the only way art gets in.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const URL_BASE = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_BASE || !KEY) {
  console.error("card art: set SUPABASE_URL and SUPABASE_SECRET_KEY");
  process.exit(1);
}

const ROOT = new URL("../assets/card-art/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", ROOT), "utf8"));
const items = [...manifest.cards, manifest.back];
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

let failures = 0;
for (const item of items) {
  const bytes = readFileSync(new URL(item.file, ROOT));
  if (sha256(bytes) !== item.sha256) {
    console.error(`${item.file}: local file does not match the manifest; not uploading`);
    failures++;
    continue;
  }

  const put = await fetch(`${URL_BASE}/storage/v1/object/card-art/${item.file}`, {
    method: "POST",
    headers: {
      apikey: KEY,
      authorization: `Bearer ${KEY}`,
      "content-type": "image/svg+xml",
      "cache-control": "max-age=31536000",
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!put.ok) {
    console.error(`${item.file}: upload failed, ${put.status} ${await put.text()}`);
    failures++;
    continue;
  }

  const get = await fetch(`${URL_BASE}/storage/v1/object/public/card-art/${item.file}?v=${item.sha256.slice(0, 8)}`);
  const served = Buffer.from(await get.arrayBuffer());
  const ok = get.ok && sha256(served) === item.sha256;
  console.log(`${ok ? "ok  " : "BAD "} ${item.file.padEnd(12)} ${String(served.length).padStart(8)} bytes  ${get.headers.get("content-type")}`);
  if (!ok) failures++;
}

console.log(failures ? `card art: ${failures} of ${items.length} failed` : `card art: all ${items.length} uploaded and read back identical`);
process.exit(failures ? 1 : 0);
