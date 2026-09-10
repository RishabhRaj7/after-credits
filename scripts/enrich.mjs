/**
 * enrich.mjs — the real data pipeline.
 *
 * Reads library.csv, keeps rows whose list_status is in
 * scripts/lib/config.mjs → INCLUDED_STATUSES (edit that ONE array to tune
 * what counts), then enriches each row from TMDB and writes
 * data/enriched-library.json for the static site to bake in.
 *
 *   TMDB_API_KEY=xxxxx node scripts/enrich.mjs            # full run
 *   TMDB_API_KEY=xxxxx node scripts/enrich.mjs --limit=8  # smoke test
 *   node scripts/enrich.mjs --dry                         # filter report only
 *
 * Auth: either TMDB_API_KEY (v3, sent as ?api_key=) or
 * TMDB_READ_ACCESS_TOKEN (v4, sent as Bearer). Build-time only — the key
 * never appears in client code or the output JSON.
 *
 * Behaviour:
 *   • tmdb_id present → direct /movie/{id} or /tv/{id} lookup.
 *   • tmdb_id missing → /search fallback on title + year (keeps the
 *     pipeline working even for partial exports; misses are flagged).
 *   • tvdb_id is intentionally unused — TMDB is primary for movies AND tv.
 *   • Aggressive disk cache (scripts/.cache/tmdb) — re-runs only fetch
 *     what's new. ~130ms between live requests; 429/5xx retried w/ backoff.
 *   • Lookup failures are FLAGGED in meta.failures and the entry is kept
 *     (falling back to any offline fields), never silently dropped.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { INCLUDED_STATUSES, EXCLUDE_IF_HIDDEN, PATHS, TMDB } from './lib/config.mjs';
import { parseCsv } from './lib/csv.mjs';
import { makeId, watchMinutesFor } from './lib/watchtime.mjs';

const API_KEY = process.env.TMDB_API_KEY;
const READ_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
const args = new Map(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const LIMIT = args.has('limit') ? Number(args.get('limit')) : Infinity;
const FORCE = args.has('force');
const DRY = args.has('dry');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── TMDB fetching with cache + rate limit + retry ────────────────────── */
mkdirSync(PATHS.tmdbCache, { recursive: true });
let liveCalls = 0;

async function tmdb(path, params = {}) {
  const url = new URL(`${TMDB.base}${path}`);
  url.searchParams.set('language', TMDB.language);
  if (API_KEY) url.searchParams.set('api_key', API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const cacheKey = `${path.replaceAll('/', '_')}_${[...url.searchParams.entries()]
    .filter(([k]) => !['api_key', 'language'].includes(k))
    .map(([k, v]) => `${k}=${v}`).join('&')}`.replace(/[^\w=&.-]/g, '-').slice(0, 190);
  const cacheFile = join(PATHS.tmdbCache, `${cacheKey}.json`);
  if (!FORCE && existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8'));

  let attempt = 0;
  for (;;) {
    attempt++;
    await sleep(TMDB.delayMs);
    liveCalls++;
    const res = await fetch(url, {
      headers: READ_TOKEN ? { Authorization: `Bearer ${READ_TOKEN}` } : {},
    });
    if (res.ok) {
      const json = await res.json();
      writeFileSync(cacheFile, JSON.stringify(json));
      return json;
    }
    if ((res.status === 429 || res.status >= 500) && attempt <= TMDB.maxRetries) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      await sleep(Math.max(retryAfter * 1000, TMDB.retryBaseMs * attempt));
      continue;
    }
    const body = await res.text().catch(() => '');
    throw new Error(`TMDB ${res.status} for ${path}: ${body.slice(0, 160)}`);
  }
}

const sleep2 = sleep; // (alias kept for readability below)

/* ── load + filter CSV ────────────────────────────────────────────────── */
const rows = parseCsv(readFileSync(PATHS.csv, 'utf8'));
const kept = [];
let excluded = 0;
for (const r of rows) {
  if (EXCLUDE_IF_HIDDEN && r.hidden_at) { excluded++; continue; }
  if (!INCLUDED_STATUSES.includes(r.list_status)) { excluded++; continue; }
  kept.push(r);
}
console.log(`library.csv → ${kept.length} rows pass filter (${excluded} excluded)`);
console.log(`statuses included: ${INCLUDED_STATUSES.join(', ')}${EXCLUDE_IF_HIDDEN ? ' · hidden_at rows excluded' : ''}`);
if (DRY) process.exit(0);

if (!API_KEY && !READ_TOKEN) {
  console.error('\n✗ No TMDB credentials. Set TMDB_API_KEY (v3) or TMDB_READ_ACCESS_TOKEN (v4).');
  console.error('  Free key: https://www.themoviedb.org/settings/api');
  console.error('  To (re)build offline data instead: node scripts/seed-offline.mjs\n');
  process.exit(1);
}

/* existing offline data → fallback/merge source keyed by title+year+addedAt */
let offlineByKey = new Map();
if (existsSync(PATHS.out)) {
  const prev = JSON.parse(readFileSync(PATHS.out, 'utf8'));
  for (const e of prev.entries ?? []) {
    offlineByKey.set(`${e.title}||${e.year}||${e.addedAt}`, e);
  }
}

/* ── enrich ───────────────────────────────────────────────────────────── */
const entries = [];
const failures = [];
const todo = kept.slice(0, Number.isFinite(LIMIT) ? LIMIT : kept.length);
let n = 0;

for (const r of todo) {
  n++;
  const type = r.type === 'show' ? 'show' : 'movie';
  const kind = type === 'show' ? 'tv' : 'movie';
  const year = Number(r.year) || null;
  const offKey = `${r.title}||${r.year}||${r.added_at}`;
  const off = offlineByKey.get(offKey);

  const entry = off ? { ...off, flags: [...(off.flags ?? [])] } : {
    id: makeId(type, r.title, year, r.added_at),
    type, title: r.title,
    originalTitle: r.original_title || null,
    year, releaseDate: year ? `${year}-01-01` : null, releaseDateEstimated: true,
    addedAt: r.added_at, favorite: r.favorite === 'true', status: r.list_status,
    posterPath: null, backdropPath: null, overview: null,
    genres: [], voteAverage: null,
    runtimeMinutes: null, episodeRunTime: null, numberOfEpisodes: null,
    imdbId: null, tmdbId: null, tvdbId: r.tvdb_id || null,
    watchMinutes: null, watchEstimated: false, flags: [],
  };

  try {
    let tmdbId = r.tmdb_id ? Number(r.tmdb_id) : null;
    if (!tmdbId) {
      const q = new URLSearchParams(r.title).toString();
      const search = await tmdb(`/search/${kind}`, {
        query: r.title,
        ...(kind === 'movie' ? { year } : { first_air_date_year: year }),
        include_adult: false,
      });
      tmdbId = search.results?.[0]?.id ?? null;
      if (!tmdbId) throw new Error('no search result');
    }
    const d = await tmdb(`/${kind}/${tmdbId}`);
    const isShow = kind === 'tv';
    const eps = isShow ? (d.number_of_episodes ?? null) : null;
    const epTime = isShow
      ? (d.episode_run_time?.[0] ?? d.last_episode_to_air?.runtime ?? null)
      : null;
    Object.assign(entry, {
      id: makeId(type, r.title, year, r.added_at),
      title: d.title ?? d.name ?? r.title,
      originalTitle: r.original_title || d.original_title || d.original_name || null,
      releaseDate: (isShow ? d.first_air_date : d.release_date) || entry.releaseDate,
      releaseDateEstimated: !(isShow ? d.first_air_date : d.release_date),
      posterPath: d.poster_path ?? entry.posterPath,
      backdropPath: d.backdrop_path ?? null,
      overview: d.overview || null,
      genres: (d.genres ?? []).map((g) => g.name),
      voteAverage: d.vote_average ?? null,
      runtimeMinutes: isShow ? entry.runtimeMinutes : (d.runtime ?? entry.runtimeMinutes),
      episodeRunTime: isShow ? epTime ?? entry.episodeRunTime : null,
      numberOfEpisodes: isShow ? eps : null,
      episodesEstimated: isShow && !eps ? entry.episodesEstimated : false,
      watchEstimated: isShow && (!eps || !epTime),
      imdbId: d.imdb_id ?? d.external_ids?.imdb_id ?? entry.imdbId,
      tmdbId, tvdbId: r.tvdb_id || null,
      flags: (entry.flags ?? []).filter((f) => f !== 'tmdb-lookup-failed'),
    });
    entry.watchMinutes = watchMinutesFor(entry)
      ?? off?.watchMinutes ?? null;
    if (entry.watchMinutes != null && isShow && eps && epTime) entry.watchEstimated = false;
  } catch (err) {
    entry.flags = [...new Set([...(entry.flags ?? []), 'tmdb-lookup-failed'])];
    failures.push({ title: r.title, year, tmdbId: r.tmdb_id || null, reason: String(err.message ?? err) });
  }

  entries.push(entry);
  if (n % 40 === 0 || n === todo.length) {
    process.stdout.write(`\r  ${n}/${todo.length} enriched · ${liveCalls} live calls · ${failures.length} failed   `);
  }
}
console.log('');

/* keep untouched entries from a --limit run so the file stays complete */
if (entries.length < kept.length) {
  for (const r of kept.slice(entries.length)) {
    const off = offlineByKey.get(`${r.title}||${r.year}||${r.added_at}`);
    if (off) entries.push(off);
  }
}

const totals = {
  entries: entries.length,
  movies: entries.filter((e) => e.type === 'movie').length,
  shows: entries.filter((e) => e.type === 'show').length,
  watchMinutes: entries.reduce((s, e) => s + (e.watchMinutes ?? 0), 0),
  estimatedShowMinutes: entries.reduce((s, e) => s + (e.watchEstimated ? e.watchMinutes ?? 0 : 0), 0),
};

const out = {
  meta: {
    generatedAt: new Date().toISOString(),
    source: failures.length ? 'tmdb+partial-fallback' : 'tmdb',
    note: 'TMDB-enriched. Show watch time = episode_run_time[0] × number_of_episodes (approximation — ongoing shows undercount).',
    csvRows: rows.length,
    included: kept.length,
    excluded,
    includedStatuses: INCLUDED_STATUSES,
    excludeIfHidden: EXCLUDE_IF_HIDDEN,
    failures,
    totals,
  },
  entries,
};
mkdirSync('data', { recursive: true });
writeFileSync(PATHS.out, JSON.stringify(out));
console.log(`✓ ${PATHS.out} — ${entries.length} entries, ${failures.length} flagged failures, ${Math.round(totals.watchMinutes / 60).toLocaleString()} h total`);
