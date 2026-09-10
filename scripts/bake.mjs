#!/usr/bin/env node
/* ── bake.mjs — CSV → data/baked-library.json + public/posters/*.jpg ──────
   Turns your tracking export into data that lives INSIDE the website:
   every title enriched from TMDB and every poster downloaded as a real
   file, so the built site needs no runtime API and no CDN. Commit the
   results to GitHub and the deployed site ships with them.

   Usage:
     TMDB_API_KEY=xxxx node scripts/bake.mjs               # full bake
     TMDB_API_KEY=xxxx node scripts/bake.mjs --limit 10    # smoke test
     node scripts/bake.mjs --no-posters                    # metadata only
     node scripts/bake.mjs --csv path/to/export.csv

   Free key: https://www.themoviedb.org/settings/api
   Edit mistakes afterwards in the site's DATA panel → EXPORT, or just
   hand-edit data/baked-library.json (it's plain JSON). */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const CSV_PATH = join(ROOT, opt('csv', 'library.csv'));
const OUT_JSON = join(ROOT, 'data', 'baked-library.json');
const POSTER_DIR = join(ROOT, 'public', 'posters');
const LIMIT = Number(opt('limit', '0')) || 0;
const WANT_POSTERS = !flag('no-posters');

const KEY = process.env.TMDB_API_KEY || '';
const TOKEN = process.env.TMDB_READ_ACCESS_TOKEN || '';
if (!KEY && !TOKEN) {
  console.error('✗ Set TMDB_API_KEY (or TMDB_READ_ACCESS_TOKEN) first.');
  process.exit(1);
}

const INCLUDED = new Set(['watching', 'following', 'stopped']);
const TMDB = 'https://api.themoviedb.org/3';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const sleep = () => delay(120);

/* ── csv ───────────────────────────────────────────────────────────────── */
function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, '');
  const rows = [];
  let cur = [], field = '', inQ = false;
  const push = () => { cur.push(field); field = ''; };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') push();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      push();
      if (cur.some((f) => f.trim())) rows.push(cur);
      cur = [];
    } else field += c;
  }
  push();
  if (cur.some((f) => f.trim())) rows.push(cur);
  const [head, ...body] = rows;
  const at = (n) => head.findIndex((h) => h.trim().toLowerCase() === n);
  const I = { type: at('type'), title: at('title'), year: at('year'), tmdb: at('tmdb_id'), fav: at('favorite'), status: at('list_status'), added: at('added_at'), hidden: at('hidden_at') };
  const cell = (r, i) => (i >= 0 ? (r[i] ?? '').trim() : '');
  const out = [];
  let skipped = 0;
  for (const r of body) {
    const title = cell(r, I.title), added = cell(r, I.added);
    const status = cell(r, I.status).toLowerCase();
    const raw = cell(r, I.type).toLowerCase();
    const type = raw === 'movie' || raw === 'film' ? 'movie' : ['show', 'series', 'tv'].includes(raw) ? 'show' : null;
    if (!title || !added || !type || !INCLUDED.has(status) || cell(r, I.hidden)) { skipped++; continue; }
    out.push({
      type, title,
      year: Number(cell(r, I.year)) || null,
      tmdbId: Number(cell(r, I.tmdb)) || null,
      favorite: ['true', '1', 'yes'].includes(cell(r, I.fav).toLowerCase()),
      addedAt: added.slice(0, 10),
    });
  }
  out.sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  return { rows: out, skipped };
}

/* ── tmdb ──────────────────────────────────────────────────────────────── */
async function tmdb(path) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${TMDB}${path}${KEY ? `${sep}api_key=${KEY}` : ''}`;
  const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
  let backoff = 1200;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers });
    if (res.status === 429 || res.status >= 500) { await delay(backoff); backoff *= 2; continue; }
    if (!res.ok) return null;
    return res.json();
  }
  return null;
}

async function downloadPoster(path, file) {
  if (existsSync(file)) return true;
  const res = await fetch(`https://image.tmdb.org/t/p/w500${path}`);
  if (!res.ok) return false;
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return true;
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

/* ── main ──────────────────────────────────────────────────────────────── */
const csvText = await readFile(CSV_PATH, 'utf-8');
const { rows, skipped } = parseCsv(csvText);
const work = LIMIT ? rows.slice(0, LIMIT) : rows;
console.log(`\n  ${rows.length} watched titles parsed (${skipped} filtered out)${LIMIT ? ` — baking first ${LIMIT}` : ''}\n`);

if (WANT_POSTERS) await mkdir(POSTER_DIR, { recursive: true });

const entries = [];
const failures = [];
let postersGot = 0, postersSkipped = 0;

for (let i = 0; i < work.length; i++) {
  const r = work[i];
  process.stdout.write(`  [${String(i + 1).padStart(4)}/${work.length}] ${r.title.slice(0, 42).padEnd(42)} `);

  let data = null;
  if (r.tmdbId) data = await tmdb(`/${r.type === 'movie' ? 'movie' : 'tv'}/${r.tmdbId}`);
  if (!data && r.title) {
    const q = encodeURIComponent(r.title);
    const yr = r.year ? `&year=${r.year}&first_air_date_year=${r.year}` : '';
    const hit = await tmdb(`/search/${r.type === 'movie' ? 'movie' : 'tv'}?query=${q}${yr}`);
    if (hit?.results?.[0]) {
      const id = hit.results[0].id;
      data = await tmdb(`/${r.type === 'movie' ? 'movie' : 'tv'}/${id}`);
      if (!r.tmdbId) r.tmdbId = id;
    }
  }

  const id = r.tmdbId ? `${r.type}-${r.tmdbId}` : `csv-${slug(r.title)}`;
  const entry = {
    id, type: r.type, title: r.title, year: r.year,
    addedAt: r.addedAt, releaseDate: null,
    ...(r.favorite ? { favorite: true } : {}),
  };

  if (data) {
    if (data.poster_path) {
      const file = join(POSTER_DIR, `${id}.jpg`);
      if (!WANT_POSTERS) {
        entry.poster = String(data.poster_path).replace(/^\//, '');
      } else if (await downloadPoster(data.poster_path, file)) {
        entry.poster = `posters/${id}.jpg`;
        postersGot++;
      } else {
        postersSkipped++;
      }
      await sleep(); // be gentle with the image CDN too
    }
    entry.releaseDate = (r.type === 'movie' ? data.release_date : data.first_air_date) || null;
    if (data.genres?.length) entry.genres = data.genres.map((g) => g.name);
    if (data.overview) entry.overview = data.overview;
    if (r.type === 'movie') {
      if (data.runtime) entry.runtimeMinutes = data.runtime;
    } else {
      if (data.episode_run_time?.[0]) entry.episodeRuntime = data.episode_run_time[0];
      if (data.number_of_episodes) entry.episodes = data.number_of_episodes;
      else entry.episodesEstimated = true;
    }
    if (!entry.year && entry.releaseDate) entry.year = Number(entry.releaseDate.slice(0, 4));
    console.log('✓');
  } else {
    failures.push(r.title);
    console.log('✗ lookup failed — kept with CSV facts only');
  }

  entries.push(entry);
  await sleep();
}

await mkdir(dirname(OUT_JSON), { recursive: true });
await writeFile(OUT_JSON, JSON.stringify(entries, null, 2));

console.log(`\n  ✓ wrote ${entries.length} entries → data/baked-library.json`);
if (WANT_POSTERS) console.log(`  ✓ ${postersGot} posters → public/posters/ (${postersSkipped} failed)`);
if (failures.length) console.log(`  ! ${failures.length} lookups failed:\n    ${failures.join(', ')}\n    (fix them in the site's DATA panel or by hand, then re-run)`);
console.log('\n  Next: npm run build — the site now ships with your data.\n');
