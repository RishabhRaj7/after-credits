import baked from '../../data/baked-library.json';

/* ── types ─────────────────────────────────────────────────────────────── */

export type EntryType = 'movie' | 'show';
export type Order = 'watch' | 'release';
export type TypeFilter = 'all' | 'movie' | 'show';
export type Dir = 'asc' | 'desc';

export interface Entry {
  id: string;
  type: EntryType;
  title: string;
  year: number | null;
  addedAt: string; // ISO date — the watch-order proxy
  releaseDate: string | null;
  favorite?: boolean;
  runtimeMinutes?: number; // movies
  episodes?: number; // shows
  episodeRuntime?: number; // shows
  episodesEstimated?: boolean;
  poster?: string; // local path ("posters/x.jpg"), full url, or bare TMDB id
  overview?: string;
  genres?: string[];
}

export type ClusterKind = 'single' | 'run' | 'binge' | 'backlog';

export interface Cluster {
  key: string;
  items: Entry[];
  startTs: number;
  endTs: number;
  spanDays: number;
  size: number;
  minutes: number;
  kind: ClusterKind;
}

export interface YearGroup {
  year: number;
  items: Entry[];
  minutes: number;
}

export interface DecadeStat {
  decade: number;
  titles: number;
  minutes: number;
  years: number[];
}

export interface GenreCount {
  name: string;
  count: number;
}

/* ── genres ────────────────────────────────────────────────────────────────
   TMDB files TV and film genres under different names ("Sci-Fi & Fantasy"
   for shows, "Science Fiction" for films). Fold both into one vocabulary so
   a genre is counted once on the dial. */

const GENRE_ALIASES: Record<string, string[]> = {
  'Action & Adventure': ['Action', 'Adventure'],
  'Sci-Fi & Fantasy': ['Sci-Fi', 'Fantasy'],
  'Science Fiction': ['Sci-Fi'],
  'War & Politics': ['War', 'Politics'],
  Kids: ['Family'],
};

export function normalizeGenres(list?: string[]): string[] | undefined {
  if (!list?.length) return list;
  const out = new Set<string>();
  for (const g of list) for (const n of GENRE_ALIASES[g] ?? [g]) out.add(n);
  return [...out];
}

/* every library source (baked, server, browser, fresh import) passes through here */
export function prepareLibrary(entries: Entry[]): Entry[] {
  return entries.map((e) => ({ ...e, genres: normalizeGenres(e.genres) }));
}

/* `data/baked-library.json` is the committed source of truth — produced by
   `node scripts/bake.mjs` from library.csv, posters alongside in public/posters/ */
export const LIBRARY: Entry[] = prepareLibrary(baked as Entry[]);

/* ── dates + formatting ────────────────────────────────────────────────── */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_S = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/* local midnight, so a date never slides a day across time zones */
export function dayTs(iso: string): number {
  return new Date(iso.slice(0, 10) + 'T00:00:00').getTime();
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(dayTs(iso));
  return `${MONTHS_S[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()}`;
}

export function fmtMonth(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDur(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.round(min)}m`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/* ── watch time ────────────────────────────────────────────────────────────
   Films default to 120 min when TMDB has no runtime. Series without an
   episode runtime fall back by format: animation and straight comedy run
   half-hour episodes, everything else about an hour. */

export const FILM_FALLBACK = 120;
export const SHORT_EPISODE = 24;
export const LONG_EPISODE = 45;

export function episodeMinutes(e: Entry): number {
  if (e.episodeRuntime) return e.episodeRuntime;
  const g = e.genres ?? [];
  return g.includes('Animation') || (g.includes('Comedy') && !g.includes('Drama'))
    ? SHORT_EPISODE
    : LONG_EPISODE;
}

export function watchMinutes(e: Entry): number {
  if (e.type === 'movie') return e.runtimeMinutes ?? FILM_FALLBACK;
  return (e.episodes ?? 0) * episodeMinutes(e);
}

export function isEstimated(e: Entry): boolean {
  if (e.type === 'movie') return !e.runtimeMinutes;
  return !e.episodes || !e.episodeRuntime || !!e.episodesEstimated;
}

export function factLine(e: Entry): string {
  if (e.type === 'movie') return e.runtimeMinutes ? `${e.runtimeMinutes} MIN` : `~${FILM_FALLBACK} MIN`;
  const rt = e.episodeRuntime ? `${e.episodeRuntime}` : `~${episodeMinutes(e)}`;
  return `${e.episodes ?? '—'} EP × ${rt} MIN`;
}

/* ── ordering ──────────────────────────────────────────────────────────── */

export function sortKey(e: Entry, order: Order): number {
  return dayTs(order === 'watch' ? e.addedAt : (e.releaseDate ?? e.addedAt));
}

export function yearOf(e: Entry, order: Order): number {
  return new Date(sortKey(e, order)).getFullYear();
}

export function sortedEntries(items: Entry[], order: Order): Entry[] {
  return [...items].sort((a, b) => sortKey(a, order) - sortKey(b, order) || a.title.localeCompare(b.title));
}

/* ── clustering (Cluster & Burst) ──────────────────────────────────────── */

const DAY = 86400000;
const CLUSTER_GAP = 2 * DAY; // entries ≤2 days apart knot together
export const BACKLOG_MIN = 12; // this many logged within two days is catch-up, not a binge

export function clusterize(items: Entry[], order: Order): Cluster[] {
  const clusters: Cluster[] = [];
  for (const e of sortedEntries(items, order)) {
    const ts = sortKey(e, order);
    const last = clusters[clusters.length - 1];
    if (last && ts - last.endTs <= CLUSTER_GAP) {
      last.items.push(e);
      last.endTs = ts;
    } else {
      clusters.push({ key: '', items: [e], startTs: ts, endTs: ts, spanDays: 1, size: 1, minutes: 0, kind: 'single' });
    }
  }
  for (const c of clusters) {
    c.key = `${c.startTs}:${c.items[0].id}`;
    c.size = c.items.length;
    c.spanDays = Math.max(1, Math.round((c.endTs - c.startTs) / DAY) + 1);
    c.minutes = c.items.reduce((s, e) => s + watchMinutes(e), 0);
    const perDay = new Map<number, number>();
    for (const e of c.items) perDay.set(sortKey(e, order), (perDay.get(sortKey(e, order)) ?? 0) + 1);
    c.kind =
      c.size === 1 ? 'single'
      : c.size < 3 ? 'run'
      : Math.max(...perDay.values()) >= BACKLOG_MIN ? 'backlog'
      : 'binge';
  }
  return clusters;
}

/* the caption depends on what the dates mean: log dates read as nights in,
   premiere dates read as release windows */
export function headlineFor(c: Cluster, order: Order): string {
  if (order === 'release') {
    if (c.size === 1) return 'A premiere with the week to itself.';
    if (c.size === 2) return 'Two openings, same week.';
    return c.size >= 8 ? 'A crowded season of premieres.' : 'A crowded release window.';
  }
  switch (c.kind) {
    case 'single': return 'Some stories deserve their own night.';
    case 'run': return 'Two in a row. Obviously.';
    case 'backlog': return 'The backlog, logged in one sitting.';
    default: return c.size === 3 ? 'Three deep into the night.' : 'Just one more. Then another.';
  }
}

export function intensityFor(c: Cluster, order: Order): { bars: number; label: string } | null {
  if (order !== 'watch' || c.kind !== 'binge') return null;
  if (c.size >= 6) return { bars: 5, label: 'Full binge mode' };
  if (c.size >= 4) return { bars: 4, label: 'A little obsessed' };
  return { bars: 3, label: 'In too deep' };
}

/* ── year grouping (The Reel) ──────────────────────────────────────────── */

export function groupByYear(items: Entry[], order: Order): YearGroup[] {
  const map = new Map<number, Entry[]>();
  for (const e of sortedEntries(items, order)) {
    const y = yearOf(e, order);
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(e);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, list]) => ({ year, items: list, minutes: totalMinutes(list) }));
}

export function decadeStats(groups: YearGroup[]): DecadeStat[] {
  const map = new Map<number, DecadeStat>();
  for (const g of groups) {
    const d = Math.floor(g.year / 10) * 10;
    if (!map.has(d)) map.set(d, { decade: d, titles: 0, minutes: 0, years: [] });
    const s = map.get(d)!;
    s.titles += g.items.length;
    s.minutes += g.minutes;
    s.years.push(g.year);
  }
  return [...map.values()].sort((a, b) => a.decade - b.decade);
}

export function totalMinutes(items: Entry[]): number {
  return items.reduce((s, e) => s + watchMinutes(e), 0);
}

/* ── headline stats ────────────────────────────────────────────────────── */

export interface LibraryStats {
  minutes: number;
  days: number;
  hours: number;
  films: number;
  series: number;
  titles: number;
  genres: number;
  from: Date;
  to: Date;
}

export function statsFor(items: Entry[]): LibraryStats {
  const minutes = totalMinutes(items);
  const added = items.map((e) => dayTs(e.addedAt)).filter((n) => !Number.isNaN(n));
  const now = Date.now();
  return {
    minutes,
    days: Math.floor(minutes / 1440),
    hours: Math.round(minutes / 60),
    films: items.filter((e) => e.type === 'movie').length,
    series: items.filter((e) => e.type === 'show').length,
    titles: items.length,
    genres: new Set(items.flatMap((e) => e.genres ?? [])).size,
    from: new Date(added.length ? Math.min(...added) : now),
    to: new Date(added.length ? Math.max(...added) : now),
  };
}

/* genre tally for the dial — counts titles, not appearances */
export function genreCounts(entries: Entry[]): GenreCount[] {
  const map = new Map<string, number>();
  for (const e of entries) for (const g of new Set(e.genres ?? [])) map.set(g, (map.get(g) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/* TMDB page for a baked or imported entry ("movie-603" / "show-1399") */
export function tmdbUrl(e: Entry): string | null {
  const m = /^(movie|show)-(\d+)$/.exec(e.id);
  return m ? `https://www.themoviedb.org/${m[1] === 'movie' ? 'movie' : 'tv'}/${m[2]}` : null;
}
