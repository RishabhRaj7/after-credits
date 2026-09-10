/**
 * build-sample.mjs — generates a realistic `library.csv` export (same schema
 * as the real tracker export) from the curated IMDb pool. Deterministic:
 * same seed → same file, so the committed data is reproducible.
 *
 * The timeline is engineered to have texture: quiet droughts, steady months,
 * and a few dense binge bursts (lockdown March 2020, holiday breaks, etc.)
 * so both views have a density story to tell.
 *
 *   node scripts/build-sample.mjs
 *
 * Replace the generated library.csv with your real export at any time —
 * enrich.mjs works against either.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PATHS } from './lib/config.mjs';
import { toCsv } from './lib/csv.mjs';
import { mulberry32, pick, int } from './lib/hash.mjs';

const SEED = 20260909;
const rng = mulberry32(SEED);
const pool = JSON.parse(readFileSync(PATHS.pool, 'utf8'));
const movies = pool.filter((p) => p.kind === 'movie');
const shows = pool.filter((p) => p.kind === 'show');

/* ── timeline plan: month → planned add count ─────────────────────────── */
function monthlyPlan() {
  const plan = []; // {y, m, n}
  const push = (y, m, n) => { if (n > 0) plan.push({ y, m, n }); };
  for (let y = 2015; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === 2026 && m > 8) break;                 // history ends Aug 2026
      let n = 0;
      if (y === 2015 && m < 3) continue;              // joined the tracker Mar 2015
      if (y <= 2016) n = int(rng, 2, 6);              // early adopter, modest
      else if (y === 2017) {
        if (m >= 5 && m <= 10) n = int(rng, 0, 1);    // the great drought
        else n = int(rng, 2, 5);
      }
      else if (y === 2018) n = m === 12 ? int(rng, 8, 11) : int(rng, 3, 6);
      else if (y === 2019) n = int(rng, 3, 7);
      else if (y === 2020) {                          // lockdown era
        if (m >= 3 && m <= 9) n = int(rng, 11, 16);
        else if (m >= 10) n = int(rng, 7, 10);
        else n = int(rng, 4, 6);
      }
      else if (y === 2021) n = m === 12 ? int(rng, 10, 13) : int(rng, 4, 8);
      else if (y === 2022) n = int(rng, 3, 7);
      else if (y === 2023) n = (m === 8) ? int(rng, 11, 14) : int(rng, 3, 7); // august binge
      else if (y === 2024) n = int(rng, 4, 8);
      else if (y === 2025) n = m === 1 ? int(rng, 9, 12) : int(rng, 4, 8);
      else if (y === 2026) n = int(rng, 3, 7);
      push(y, m, n);
    }
  }
  return plan;
}

/* binge bursts: extra entries packed into a few days inside given months */
const BURSTS = [
  { y: 2020, m: 4,  n: 9,  spanDays: 6 },
  { y: 2021, m: 12, n: 8,  spanDays: 7 },
  { y: 2023, m: 8,  n: 10, spanDays: 5 },
  { y: 2025, m: 1,  n: 7,  spanDays: 4 },
  { y: 2025, m: 12, n: 9,  spanDays: 8 },
];

/* ── title selection: popularity walk with jittered steps ─────────────── */
function makeWalker(list) {
  let idx = 0;
  const used = new Set();
  return () => {
    for (let guard = 0; guard < 40; guard++) {
      const step = 1 + Math.floor(Math.pow(rng(), 2.6) * 260); // mostly hits, some deep cuts
      const i = idx + step;
      if (i >= list.length) { idx = 0; continue; }
      idx = i;
      const t = list[idx];
      if (!used.has(t.imdb)) { used.add(t.imdb); return t; }
    }
    return list[int(rng, 0, list.length - 1)];
  };
}
const nextMovie = makeWalker(movies);
const nextShow = makeWalker(shows);

/* push the marquee canon into the early months so the wall has anchors */
const CANON = [
  'The Shawshank Redemption', 'The Godfather', 'The Dark Knight', 'Pulp Fiction',
  'Fight Club', 'Inception', 'Breaking Bad', 'The Matrix', 'Interstellar',
  'Game of Thrones', 'Forrest Gump', 'The Sopranos', 'Goodfellas', 'Se7en',
  'The Silence of the Lambs', 'The Wire', 'Gladiator', 'Alien', 'The Shining',
  'Stranger Things',
];
const canonPool = CANON
  .map((t) => pool.find((p) => p.title === t))
  .filter(Boolean);
const walkerUsed = new Set();
const drawTitle = (wantShow) => {
  // ~85% of canon gets placed early
  const remaining = canonPool.filter((c) => !walkerUsed.has(c.imdb));
  if (remaining.length && rng() < 0.08) {
    const c = remaining[0];
    if ((c.kind === 'show') === wantShow || rng() < 0.3) {
      walkerUsed.add(c.imdb);
      return c;
    }
  }
  const t = wantShow ? nextShow() : nextMovie();
  walkerUsed.add(t.imdb);
  return t;
};

/* ── statuses ─────────────────────────────────────────────────────────── */
function rollStatus(t, addedAt) {
  const r = rng();
  const isRecent = addedAt >= new Date('2025-06-01T00:00:00Z');
  if (t.kind === 'show') {
    if (isRecent && r < 0.24) return 'watching';
    if (r < 0.46) return 'following';
    if (r < 0.84) return 'stopped';
    return 'for_later';
  }
  if (isRecent && r < 0.12) return 'watching';
  if (r < 0.60) return 'following';
  if (r < 0.86) return 'stopped';
  return 'for_later';
}

/* ── compose rows ─────────────────────────────────────────────────────── */
const rows = [];
const mapRows = [];
const seen = new Set();

function addedDate(y, m, spanDays = null) {
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const d = spanDays ? int(rng, 1, Math.min(spanDays, daysIn)) : int(rng, 1, daysIn);
  const dt = new Date(Date.UTC(y, m - 1, d, int(rng, 17, 23), int(rng, 0, 59), int(rng, 0, 59)));
  return dt;
}

function addEntry(y, m, spanDays, showBias = 0.22) {
  let added = addedDate(y, m, spanDays);
  const t = drawTitle(rng() < showBias);
  const key = `${t.imdb}`;
  if (seen.has(key)) return;
  seen.add(key);
  const status = rollStatus(t, added);
  const hidden = rng() < 0.025 && status !== 'watching';
  const addedIso = added.toISOString();
  const later = status === 'for_later' ? addedIso : '';
  const stopped = status === 'stopped'
    ? new Date(added.getTime() + int(rng, 3, 60) * 864e5).toISOString()
    : '';
  rows.push({
    type: t.kind,
    title: t.title,
    original_title: t.original === t.title ? '' : t.original,
    year: t.year,
    tvdb_id: '',            // sample has no TVDB ids; enrich tolerates
    tmdb_id: '',            // sample has no TMDB ids; enrich falls back to title+year search
    favorite: rng() < 0.075 ? 'true' : 'false',
    list_status: status,
    added_at: addedIso,
    for_later_at: later,
    stopped_watching_at: stopped,
    hidden_at: hidden ? new Date(added.getTime() + int(rng, 30, 200) * 864e5).toISOString() : '',
  });
  mapRows.push({ key: `${t.title}||${t.year}||${addedIso}`, imdb: t.imdb });
}

for (const { y, m, n } of monthlyPlan()) {
  // 2020 lockdown = prestige-TV catch-up era, skew to shows
  const showBias = y === 2020 || y === 2021 ? 0.34 : 0.22;
  for (let i = 0; i < n; i++) addEntry(y, m, null, showBias);
}
for (const b of BURSTS) {
  for (let i = 0; i < b.n; i++) {
    let added = addedDate(b.y, b.m, b.spanDays);
    const t = drawTitle(rng() < 0.30);
    if (seen.has(t.imdb)) continue;
    seen.add(t.imdb);
    const status = rollStatus(t, added);
    const addedIso = added.toISOString();
    rows.push({
      type: t.kind, title: t.title,
      original_title: t.original === t.title ? '' : t.original,
      year: t.year, tvdb_id: '', tmdb_id: '',
      favorite: rng() < 0.075 ? 'true' : 'false',
      list_status: status, added_at: addedIso,
      for_later_at: status === 'for_later' ? addedIso : '',
      stopped_watching_at: status === 'stopped'
        ? new Date(added.getTime() + int(rng, 3, 60) * 864e5).toISOString() : '',
      hidden_at: '',
    });
    mapRows.push({ key: `${t.title}||${t.year}||${addedIso}`, imdb: t.imdb });
  }
}

/* chronological + stable */
rows.sort((a, b) => a.added_at.localeCompare(b.added_at) || a.title.localeCompare(b.title));

const COLUMNS = [
  'type', 'title', 'original_title', 'year', 'tvdb_id', 'tmdb_id',
  'favorite', 'list_status', 'added_at', 'for_later_at',
  'stopped_watching_at', 'hidden_at',
];
const csv = '﻿' + toCsv(rows, COLUMNS); // BOM, like the real export
writeFileSync(PATHS.csv, csv);
mkdirSync('scripts/.cache', { recursive: true });
writeFileSync(PATHS.sampleMap, JSON.stringify({
  seed: SEED,
  rowCount: rows.length,
  map: mapRows,
}));

const included = rows.filter((r) => ['watching', 'following', 'stopped'].includes(r.list_status) && !r.hidden_at);
console.log(`library.csv: ${rows.length} rows (${included.length} pass the default filter)`);
console.log(`movies: ${included.filter((r) => r.type === 'movie').length}, shows: ${included.filter((r) => r.type === 'show').length}`);
console.log(`span: ${rows[0].added_at.slice(0, 10)} → ${rows[rows.length - 1].added_at.slice(0, 10)}`);
