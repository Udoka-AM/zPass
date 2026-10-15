#!/usr/bin/env node
// Fetch the Semaphore v4 proving artefacts (depth 20) once, verify their
// SHA-256 against the pinned values in scripts/artifacts.json, and place them
// in apps/web/public/artifacts so the prover never calls a third party
// (task 1.6, docs/02-TRD.md §2.3).
//
//   node scripts/fetch-artifacts.mjs           fetch (or reuse) and verify
//   node scripts/fetch-artifacts.mjs --pin     record checksums of what was fetched
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "scripts/artifacts.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const out = join(root, "apps/web/public/artifacts");
const pin = process.argv.includes("--pin");

mkdirSync(out, { recursive: true });
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

let failed = false;
for (const file of manifest.files) {
  const path = join(out, file.name);
  let data = existsSync(path) ? readFileSync(path) : null;
  if (!data || (!pin && sha256(data) !== file.sha256)) {
    const url = `${manifest.base}/${file.name}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    data = Buffer.from(await res.arrayBuffer());
    writeFileSync(path, data);
  }
  const got = sha256(data);
  if (pin) {
    file.sha256 = got;
    file.bytes = data.length;
  } else if (got !== file.sha256) {
    console.error(`checksum mismatch for ${file.name}: ${got}`);
    failed = true;
  }
  console.log(`${file.name}  ${(data.length / 1e6).toFixed(1)} MB  ${got}`);
}
if (pin) writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
if (failed) process.exit(1);
