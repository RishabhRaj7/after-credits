/**
 * seed-offline.mjs — builds data/enriched-library.json WITHOUT any API key,
 * by joining library.csv onto the IMDb-derived pool (scripts/build-pool.mjs).
 *
 *   • Movie runtimes are real (IMDb), exact to the cut IMDb tracks.
 *   • Show runtimes/episode counts are ESTIMATED (flagged per entry), because
 *     IMDb basics has no episode counts — TMDB (enrich.mjs) replaces them
 *     with real numbers when you have a key.
 *   • No poster paths exist offline → the UI's typographic poster treatment
 *     renders instead; real posters drop in automatically after enrichment.
 *
 *   node scripts/seed-offline.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { INCLUDED_STATUSES, EXCLUDE_IF_HIDDEN, PATHS } from './lib/config.mjs';
import { parseCsv } from './lib/csv.mjs';
import { fnv1a } from './lib/hash.mjs';
import { estimateEpisodes, makeId, watchMinutesFor } from './lib/watchtime.mjs';

const csvText = readFileSync(PATHS.csv, 'utf8');
const rows = parseCsv(csvText);
const pool = JSON.parse(readFileSync(PATHS.pool, 'utf8'));
const byImdb = new Map(pool.map((p) => [p.imdb, p]));
const byTitleYear = new Map();
for (const p of pool) {
  const k = `${p.title.toLowerCase()}|${p.year}`;
  if (!byTitleYear.has(k)) byTitleYear.set(k, p);
}

/* sample-map gives exact joins for the generated sample; if the user swapped
   in their real CSV the map is stale → we detect that and fuzzy-join. */
let sampleMap = null;
if (existsSync(PATHS.sampleMap)) {
  const sm = JSON.parse(readFileSync(PATHS.sampleMap, 'utf8'));
  if (sm.rowCount === rows.length) {
    sampleMap = new Map(sm.map.map((m) => [m.key, m.imdb]));
  } else {
    console.warn('! sample-map is stale for current library.csv — fuzzy join instead');
  }
}

const entries = [];
const failures = [];
let excluded = 0;
let excludedForLater = 0;
let excludedHidden = 0;

for (const r of rows) {
  const status = r.list_status;
  if (EXCLUDE_IF_HIDDEN && r.hidden_at) { excluded++; excludedHidden++; continue; }
  if (!INCLUDED_STATUSES.includes(status)) { excluded++; if (status === 'for_later') excludedForLater++; continue; }

  const key = `${r.title}||${r.year}||${r.added_at}`;
  let p = sampleMap ? byImdb.get(sampleMap.get(key)) : null;
  if (!p) p = byTitleYear.get(`${r.title.toLowerCase()}|${r.year}`) ?? null;

  const type = r.type === 'show' ? 'show' : 'movie';
  const year = Number(r.year) || null;
  const flags = [];

  let entry = {
    id: makeId(type, r.title, year, r.added_at),
    type,
    title: p?.title ?? r.title,
    originalTitle: r.original_title || (p && p.original !== p.title ? p.original : null),
    year,
    releaseDate: year ? `${year}-01-01` : null,
    releaseDateEstimated: true,                   // offline knows year only
    addedAt: r.added_at,
    favorite: r.favorite === 'true',
    status,
    posterPath: null,                             // no posters without TMDB
    backdropPath: null,
    overview: null,
    genres: p?.genres ?? [],
    voteAverage: p?.rating ?? null,
    runtimeMinutes: null,
    episodeRunTime: null,
    numberOfEpisodes: null,
    imdbId: p?.imdb ?? null,
    tmdbId: r.tmdb_id ? Number(r.tmdb_id) : null,
    tvdbId: r.tvdb_id || null,
    watchMinutes: null,
    watchEstimated: false,
    flags,
  };

  if (!p) {
    flags.push('offline-match-failed');
    failures.push({ title: r.title, year, tmdbId: entry.tmdbId, reason: 'no IMDb pool match' });
  } else if (type === 'movie') {
    entry.runtimeMinutes = p.runtime;
  } else {
    entry.episodeRunTime = Math.min(Math.max(p.runtime, 15), 95); // sanity clamp
    entry.numberOfEpisodes = estimateEpisodes(entry.title, year ?? 2015, p.endYear);
    entry.episodesEstimated = true;
    entry.watchEstimated = true;
  }

  entry.watchMinutes = watchMinutesFor(entry);
  entries.push(entry);
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
    source: 'offline-seed',
    note: 'Movie runtimes are real (IMDb). Show runtimes are estimated (episodesEstimated) until enriched via TMDB (scripts/enrich.mjs). No poster paths offline — the UI renders typographic title cards; real posters appear after TMDB enrichment.',
    csvRows: rows.length,
    included: entries.length,
    excluded,
    excludedForLater,
    excludedHidden,
    includedStatuses: INCLUDED_STATUSES,
    excludeIfHidden: EXCLUDE_IF_HIDDEN,
    failures,
    totals,
  },
  entries,
};

mkdirSync('data', { recursive: true });
writeFileSync(PATHS.out, JSON.stringify(out));
const kb = Math.round(JSON.stringify(out).length / 1024);
console.log(`✓ ${PATHS.out}`);
console.log(`  ${entries.length} entries (${totals.movies} movies, ${totals.shows} shows) — ${kb} KB`);
console.log(`  total watch time: ${Math.round(totals.watchMinutes / 60).toLocaleString()} h (${Math.round(totals.estimatedShowMinutes / 60).toLocaleString()} h estimated from shows)`);
console.log(`  excluded from CSV: ${excluded} (${excludedForLater} for_later, ${excludedHidden} hidden)`);
if (failures.length) console.log(`  ⚠ failures: ${failures.length} (see meta.failures)`);
