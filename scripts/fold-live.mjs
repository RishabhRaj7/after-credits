#!/usr/bin/env node
/* ── fold-live.mjs — fold the live gist into the baked library ────────────
   Titles logged from the site's Quick log live in a GitHub Gist and are
   layered over data/baked-library.json at runtime. Every so often, fold them
   in for good: this applies the gist's changes to the baked JSON and
   downloads posters for the new titles into public/posters/.

     VITE_LIBRARY_GIST_ID=<id> node scripts/fold-live.mjs
     VITE_LIBRARY_GIST_ID=<id> GITHUB_TOKEN=<token> node scripts/fold-live.mjs --clear

   --clear empties the gist afterwards (needs a token with the "gist" scope).
   Then `npm run build` and commit as usual. Nothing is lost if you skip
   --clear: already-baked entries in the gist simply match the bake. */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BAKED = join(ROOT, 'data', 'baked-library.json');
const POSTERS = join(ROOT, 'public', 'posters');
const FILE = 'after-credits-live.json';
const RAW_GIST = process.env.VITE_LIBRARY_GIST_ID || process.argv.find((a) => /[0-9a-f]{20,}/i.test(a)) || '';
// accepts the bare id or the whole gist URL
const GIST = (RAW_GIST.trim().match(/([0-9a-f]{20,})\/?(?:#.*)?$/i) || [])[1];
const TOKEN = process.env.GITHUB_TOKEN || '';
const CLEAR = process.argv.includes('--clear');

if (!GIST) {
  console.error('✗ Set VITE_LIBRARY_GIST_ID (or pass the gist id).');
  process.exit(1);
}

const headers = { Accept: 'application/vnd.github+json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) };
const res = await fetch(`https://api.github.com/gists/${GIST}`, { headers });
if (!res.ok) {
  console.error(`✗ GitHub returned ${res.status} for gist ${GIST}.`);
  process.exit(1);
}
const gist = await res.json();
const file = gist.files?.[FILE];
const raw = file?.truncated ? await (await fetch(file.raw_url)).text() : file?.content;
const overlay = raw ? JSON.parse(raw) : {};
const entries = Array.isArray(overlay.entries) ? overlay.entries : [];
const removed = new Set(Array.isArray(overlay.removed) ? overlay.removed : []);

if (!entries.length && !removed.size) {
  console.log('✓ The live gist is empty — nothing to fold.');
  process.exit(0);
}

/* same rules as the site (src/data/live.ts): a gist entry replaces the baked
   title it matches by id or by type + normalised title + year */
const identity = (e) => `${e.type}|${e.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '')}|${e.year ?? ''}`;
const baked = JSON.parse(await readFile(BAKED, 'utf8'));
const live = entries.filter((e) => !removed.has(e.id));
const byId = new Map(live.map((e) => [e.id, e]));
const byIdentity = new Map(live.map((e) => [identity(e), e]));
const used = new Set();
const out = [];
for (const e of baked) {
  if (removed.has(e.id)) continue;
  const p = byId.get(e.id) ?? byIdentity.get(identity(e));
  if (p && !used.has(p)) {
    used.add(p);
    out.push(p);
  } else if (!p) out.push(e);
}
for (const p of live) if (!used.has(p) && !out.some((e) => e.id === p.id || identity(e) === identity(p))) out.push(p);

/* bare TMDB poster ids → local files, like the bake does */
await mkdir(POSTERS, { recursive: true });
let downloaded = 0;
for (const e of out) {
  if (!e.poster || e.poster.includes('/')) continue;
  const local = `posters/${e.id}.jpg`;
  const dest = join(ROOT, 'public', local);
  if (!existsSync(dest)) {
    const img = await fetch(`https://image.tmdb.org/t/p/w500/${e.poster}.jpg`);
    if (!img.ok) {
      console.warn(`  ! poster failed for ${e.title} — keeping the CDN path`);
      continue;
    }
    await writeFile(dest, Buffer.from(await img.arrayBuffer()));
    downloaded++;
  }
  e.poster = local;
}

out.sort((a, b) => a.addedAt.localeCompare(b.addedAt));
await writeFile(BAKED, JSON.stringify(out, null, 2) + '\n');
console.log(`✓ Folded ${entries.length} changed/new and ${removed.size} removed titles → ${out.length} in data/baked-library.json (${downloaded} posters downloaded).`);

if (CLEAR) {
  if (!TOKEN) {
    console.error('✗ --clear needs GITHUB_TOKEN.');
    process.exit(1);
  }
  const empty = { version: 1, updatedAt: new Date().toISOString(), entries: [], removed: [] };
  const r = await fetch(`https://api.github.com/gists/${GIST}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(empty) } } }),
  });
  console.log(r.ok ? '✓ Live gist cleared.' : `✗ Could not clear the gist (${r.status}).`);
}
console.log('  Next: npm run build, then commit.');
