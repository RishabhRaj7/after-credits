import type { Entry } from './library';

/* ── persistence ─────────────────────────────────────────────────────────
   The enriched library prefers the server store (GET/POST/DELETE
   /api/library — see server.mjs) and falls back to localStorage when the
   site is hosted statically. Poster images stream from the TMDB CDN
   (only their paths are stored). The TMDB API key + lookup cache stay in
   the browser on purpose: device-local credentials, not shared data. */

export type StoreMode = 'server' | 'browser' | 'sample';

/* ── server store (server.mjs) ───────────────────────────────────────────
   Preferred: the library lives on the server so every device/visitor sees
   it. When the site is hosted statically with no backend, the probe fails
   and the app transparently falls back to localStorage below. */

export async function fetchServerLibrary(): Promise<Entry[] | null> {
  try {
    const res = await fetch('/api/library', { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    if (!res.headers.get('content-type')?.includes('application/json')) return null;
    const data = (await res.json()) as { entries?: Entry[] };
    return Array.isArray(data.entries) && data.entries.length ? data.entries : null;
  } catch {
    return null;
  }
}

export async function saveServerLibrary(entries: Entry[]): Promise<boolean> {
  try {
    const res = await fetch('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteServerLibrary(): Promise<boolean> {
  try {
    const res = await fetch('/api/library', { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

/* ── browser fallback store ────────────────────────────────────────────── */

const LS_LIB = 'ac:library:v1';
const LS_KEY = 'ac:tmdb:key';
const LS_CACHE = 'ac:tmdb:cache:v1';

export function loadStoredLibrary(): Entry[] | null {
  try {
    const raw = localStorage.getItem(LS_LIB);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry[];
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredLibrary(entries: Entry[]): void {
  try {
    localStorage.setItem(LS_LIB, JSON.stringify(entries));
  } catch {
    /* storage full — surface nothing, the in-memory library still works */
  }
}

export function clearStoredLibrary(): void {
  try {
    localStorage.removeItem(LS_LIB);
  } catch {
    /* noop */
  }
}

export function getTmdbKey(): string {
  try {
    return localStorage.getItem(LS_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setTmdbKey(key: string): void {
  try {
    if (key) localStorage.setItem(LS_KEY, key);
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* noop */
  }
}

/* ── CSV parsing ───────────────────────────────────────────────────────── */

const INCLUDED_STATUSES = new Set(['watching', 'following', 'stopped']);

export interface ParsedRow {
  type: 'movie' | 'show';
  title: string;
  year: number | null;
  tmdbId: number | null;
  favorite: boolean;
  addedAt: string; // YYYY-MM-DD
}

export interface ParseResult {
  rows: ParsedRow[];
  total: number;
  skipped: number;
}

function splitCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQ = false;
  const push = () => {
    cur.push(field);
    field = '';
  };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') push();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      push();
      if (cur.some((f) => f.trim() !== '')) rows.push(cur);
      cur = [];
    } else field += c;
  }
  push();
  if (cur.some((f) => f.trim() !== '')) rows.push(cur);
  return rows;
}

export function parseLibraryCsv(text: string): ParseResult {
  const [head, ...body] = splitCsv(text);
  if (!head) return { rows: [], total: 0, skipped: 0 };
  const idx = (name: string) => head.findIndex((h) => h.trim().toLowerCase() === name);
  const I = {
    type: idx('type'),
    title: idx('title'),
    year: idx('year'),
    tmdb: idx('tmdb_id'),
    fav: idx('favorite'),
    status: idx('list_status'),
    added: idx('added_at'),
    hidden: idx('hidden_at'),
  };
  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');

  let skipped = 0;
  const rows: ParsedRow[] = [];
  for (const r of body) {
    const title = cell(r, I.title);
    const added = cell(r, I.added);
    const status = cell(r, I.status).toLowerCase();
    const hidden = cell(r, I.hidden);
    const rawType = cell(r, I.type).toLowerCase();
    const type: 'movie' | 'show' | null =
      rawType === 'movie' || rawType === 'film'
        ? 'movie'
        : rawType === 'show' || rawType === 'series' || rawType === 'tv'
          ? 'show'
          : null;
    if (!title || !added || !type || !INCLUDED_STATUSES.has(status) || hidden) {
      skipped++;
      continue;
    }
    const y = Number(cell(r, I.year));
    const tmdb = Number(cell(r, I.tmdb));
    const fav = ['true', '1', 'yes'].includes(cell(r, I.fav).toLowerCase());
    rows.push({
      type,
      title,
      year: Number.isFinite(y) && y > 0 ? y : null,
      tmdbId: Number.isFinite(tmdb) && tmdb > 0 ? tmdb : null,
      favorite: fav,
      addedAt: added.slice(0, 10),
    });
  }
  rows.sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  return { rows, total: body.length, skipped };
}

/* ── TMDB enrichment ───────────────────────────────────────────────────── */

const TMDB = 'https://api.themoviedb.org/3';
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface CacheMap {
  [id: string]: Entry;
}

function loadCache(): CacheMap {
  try {
    return JSON.parse(localStorage.getItem(LS_CACHE) ?? '{}') as CacheMap;
  } catch {
    return {};
  }
}

function saveCache(cache: CacheMap): void {
  try {
    localStorage.setItem(LS_CACHE, JSON.stringify(cache));
  } catch {
    /* noop */
  }
}

async function tmdbGet(path: string, key: string): Promise<Record<string, unknown>> {
  let backoff = 1200;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${TMDB}${path}${path.includes('?') ? '&' : '?'}api_key=${key}`);
    if (res.status === 401 || res.status === 403) throw new Error('TMDB rejected the API key (401). Check it and retry.');
    if (res.status === 404) return {};
    if (res.status === 429 || res.status >= 500) {
      await delay(backoff);
      backoff *= 2;
      continue;
    }
    return (await res.json()) as Record<string, unknown>;
  }
  throw new Error('TMDB rate-limited the import. Wait a minute and retry — cached titles are kept.');
}

function toEntry(row: ParsedRow, data: Record<string, unknown>): Entry {
  const base: Entry = {
    id: row.tmdbId ? `${row.type}-${row.tmdbId}` : `csv-${row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
    type: row.type,
    title: row.title,
    year: row.year,
    addedAt: row.addedAt,
    releaseDate: null,
    favorite: row.favorite || undefined,
  };
  const poster = data.poster_path as string | undefined;
  if (poster) base.poster = String(poster).replace(/^\//, '');
  const genres = data.genres as Array<{ name: string }> | undefined;
  if (genres?.length) base.genres = genres.map((g) => g.name);
  const overview = data.overview as string | undefined;
  if (overview) base.overview = overview;
  if (row.type === 'movie') {
    base.releaseDate = (data.release_date as string) || null;
    const rt = data.runtime as number | undefined;
    if (rt) base.runtimeMinutes = rt;
  } else {
    base.releaseDate = (data.first_air_date as string) || null;
    const ert = data.episode_run_time as number[] | undefined;
    const eps = data.number_of_episodes as number | undefined;
    if (ert?.[0]) base.episodeRuntime = ert[0];
    if (eps) {
      base.episodes = eps;
      base.episodesEstimated = false;
    } else {
      base.episodesEstimated = true;
    }
  }
  if (!base.year) {
    const rd = base.releaseDate;
    if (rd) base.year = Number(rd.slice(0, 4));
  }
  return base;
}

export interface EnrichProgress {
  done: number;
  total: number;
  fetched: number;
  cached: number;
  failed: number;
  current: string;
}

export async function enrichRows(
  rows: ParsedRow[],
  key: string,
  onProgress: (p: EnrichProgress) => void,
  isCancelled: () => boolean,
): Promise<Entry[]> {
  const cache = loadCache();
  const out: Entry[] = [];
  let fetched = 0;
  let cached = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    if (isCancelled()) break;
    const row = rows[i];
    const cacheKey = row.tmdbId ? `${row.type}:${row.tmdbId}` : '';
    onProgress({ done: i, total: rows.length, fetched, cached, failed, current: row.title });

    if (cacheKey && cache[cacheKey]) {
      out.push({ ...cache[cacheKey], addedAt: row.addedAt, favorite: row.favorite || undefined });
      cached++;
      continue;
    }

    try {
      let data: Record<string, unknown> = {};
      if (row.tmdbId) {
        data = await tmdbGet(`/${row.type === 'movie' ? 'movie' : 'tv'}/${row.tmdbId}`, key);
      } else {
        const q = encodeURIComponent(row.title);
        const yr = row.year ? `&year=${row.year}&first_air_date_year=${row.year}` : '';
        const hit = await tmdbGet(`/search/${row.type === 'movie' ? 'movie' : 'tv'}?query=${q}${yr}`, key);
        const results = (hit.results as Record<string, unknown>[]) ?? [];
        if (results[0]) {
          data = results[0];
          // search payloads lack runtime/episodes — fetch the full record
          const id = data.id as number | undefined;
          if (id) data = await tmdbGet(`/${row.type === 'movie' ? 'movie' : 'tv'}/${id}`, key);
        }
      }
      const entry = toEntry(row, data);
      out.push(entry);
      if (row.tmdbId && cacheKey) {
        cache[cacheKey] = entry;
        if (fetched % 8 === 0) saveCache(cache);
      }
      fetched++;
      await delay(110);
    } catch (err) {
      if (err instanceof Error && err.message.includes('API key')) throw err;
      failed++;
      // keep the row with CSV-only facts so nothing is silently dropped
      out.push({
        id: `csv-${row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
        type: row.type,
        title: row.title,
        year: row.year,
        addedAt: row.addedAt,
        releaseDate: null,
        favorite: row.favorite || undefined,
      });
    }
  }
  saveCache(cache);
  onProgress({ done: rows.length, total: rows.length, fetched, cached, failed, current: '' });
  return out;
}
