/**
 * The single data layer both views read from.
 * Static import — the whole library is baked into the build, zero runtime
 * fetching. Regenerate with `node scripts/seed-offline.mjs` (no key) or
 * `TMDB_API_KEY=… node scripts/enrich.mjs` (real posters + exact runtimes).
 */
import raw from '../../data/enriched-library.json';

/* ── types ─────────────────────────────────────────────────────────────── */

export type EntryType = 'movie' | 'show';

export interface Entry {
  id: string;
  type: EntryType;
  title: string;
  originalTitle: string | null;
  year: number | null;
  releaseDate: string | null;      // ISO date string; offline-seeded libs have
  releaseDateEstimated?: boolean;  // `${year}-01-01` + this flag
  addedAt: string;                 // ISO datetime — the watch-order proxy
  favorite: boolean;
  status: string;
  posterPath: string | null;       // TMDB path or null → typographic card
  backdropPath: string | null;
  overview: string | null;
  genres: string[];
  voteAverage: number | null;
  runtimeMinutes: number | null;   // movies
  episodeRunTime: number | null;   // shows (min/ep)
  numberOfEpisodes: number | null; // shows
  episodesEstimated?: boolean;
  watchMinutes: number | null;     // the counter input
  watchEstimated?: boolean;
  imdbId: string | null;
  tmdbId: number | null;
  tvdbId: string | null;
  flags: string[];
}

export interface LibraryMeta {
  generatedAt: string;
  source: string;
  note: string;
  csvRows: number;
  included: number;
  excluded: number;
  excludedForLater?: number;
  excludedHidden?: number;
  includedStatuses: string[];
  excludeIfHidden: boolean;
  failures: { title: string; year: number | null; tmdbId: unknown; reason: string }[];
  totals: {
    entries: number;
    movies: number;
    shows: number;
    watchMinutes: number;
    estimatedShowMinutes: number;
  };
}

const file = raw as { meta: LibraryMeta; entries: Entry[] };
export const META = file.meta;
export const ENTRIES = file.entries;

/* ── ordering ──────────────────────────────────────────────────────────── */

export type Order = 'watch' | 'release';

export const tsOf = (e: Entry, order: Order): number =>
  Date.parse(order === 'watch' ? e.addedAt : e.releaseDate ?? `${e.year ?? 2000}-01-01`);

/** ascending — the journey starts at the top of the page and ends "now" */
export function orderedEntries(order: Order): Entry[] {
  return [...ENTRIES].sort(
    (a, b) => tsOf(a, order) - tsOf(b, order) || a.title.localeCompare(b.title),
  );
}

export const keyYearOf = (e: Entry, order: Order): number =>
  new Date(tsOf(e, order)).getUTCFullYear();

export interface YearGroup {
  year: number;
  items: Entry[];
  minutes: number;
}

export function groupByYear(items: Entry[], order: Order): YearGroup[] {
  const map = new Map<number, Entry[]>();
  for (const e of items) {
    const y = keyYearOf(e, order);
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(e);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, ys]) => ({
      year,
      items: ys,
      minutes: ys.reduce((s, e) => s + (e.watchMinutes ?? 0), 0),
    }));
}

export interface DecadeStat {
  decade: number;          // 2010 → "THE 2010s"
  years: number[];
  titles: number;
  minutes: number;
}

export function decadeStats(groups: YearGroup[]): DecadeStat[] {
  const out = new Map<number, DecadeStat>();
  for (const g of groups) {
    const d = Math.floor(g.year / 10) * 10;
    if (!out.has(d)) out.set(d, { decade: d, years: [], titles: 0, minutes: 0 });
    const s = out.get(d)!;
    s.years.push(g.year);
    s.titles += g.items.length;
    s.minutes += g.minutes;
  }
  return [...out.values()].sort((a, b) => a.decade - b.decade);
}

/* ── density clustering (Cluster & Burst) ──────────────────────────────── */

export interface Cluster {
  id: string;
  items: Entry[];
  startTs: number;
  endTs: number;
  spanDays: number;
  size: number;
  binge: boolean;
}

const BINGE_SIZE = 6;

export function clusterize(items: Entry[], order: Order): Cluster[] {
  /* watched-order: 8-day gaps knot a binge week.
     release-order offline data is year-granular — wider gaps let whole
     decades breathe and stop every year collapsing into identical knots. */
  const gapDays = order === 'release' ? 45 : 8;
  const maxCluster = order === 'release' ? 14 : 12;

  const clusters: Cluster[] = [];
  let cur: Entry[] = [];
  let lastTs = 0;

  const flush = () => {
    if (!cur.length) return;
    const startTs = tsOf(cur[0], order);
    const endTs = tsOf(cur[cur.length - 1], order);
    clusters.push({
      id: `c${clusters.length}`,
      items: cur,
      startTs,
      endTs,
      spanDays: Math.max(1, Math.round((endTs - startTs) / 864e5) + 1),
      size: cur.length,
      binge: cur.length >= BINGE_SIZE,
    });
    cur = [];
  };

  for (const e of items) {
    const t = tsOf(e, order);
    if (cur.length && (t - lastTs > gapDays * 864e5 || cur.length >= maxCluster)) flush();
    cur.push(e);
    lastTs = t;
  }
  flush();
  return clusters;
}

/* ── formatting ────────────────────────────────────────────────────────── */

export const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')} · ${d.getUTCFullYear()}`;
}

export function fmtMonth(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}H ${m}M` : `${m}M`;
}

export interface DHM { days: number; hours: number; minutes: number; totalMinutes: number }
export function toDHM(totalMinutes: number): DHM {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = Math.round(totalMinutes % 60);
  return { days, hours, minutes, totalMinutes };
}

/** short fact line for blocks: movie → runtime · genre; show → eps × len */
export function factLine(e: Entry): string {
  if (e.type === 'movie') return e.runtimeMinutes ? fmtDur(e.runtimeMinutes) : 'RUNTIME N/A';
  const eps = e.numberOfEpisodes ? `${e.numberOfEpisodes} EP` : '? EP';
  const len = e.episodeRunTime ? `× ${e.episodeRunTime}M` : '';
  return `${eps} ${len}${e.episodesEstimated ? ' ·EST' : ''}`;
}

export const posterUrl = (path: string | null, size: 'w342' | 'w500' = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

/* ── deterministic art direction for poster-less entries ──────────────── */

export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

interface Palette { bg: string; edge: string; glow: string; ink: string }
/** eight duos, art-directed toward dark cinema stock — no purple gradients */
const PALETTES: Palette[] = [
  { bg: '#2b0a0e', edge: '#5c1017', glow: 'rgba(229,9,20,.30)', ink: '#f3e9e2' },
  { bg: '#141a24', edge: '#31435c', glow: 'rgba(120,160,255,.22)', ink: '#e8edf6' },
  { bg: '#101c17', edge: '#274d3d', glow: 'rgba(80,220,160,.18)', ink: '#e6f2ec' },
  { bg: '#221410', edge: '#6b4226', glow: 'rgba(255,170,90,.20)', ink: '#f4eae0' },
  { bg: '#131b1e', edge: '#265058', glow: 'rgba(80,200,210,.16)', ink: '#e5f0f1' },
  { bg: '#1c1c14', edge: '#55532a', glow: 'rgba(230,220,120,.14)', ink: '#f0eee2' },
  { bg: '#211016', edge: '#7a2230', glow: 'rgba(255,90,110,.22)', ink: '#f6e9ea' },
  { bg: '#0f141c', edge: '#24303f', glow: 'rgba(140,170,230,.14)', ink: '#e7ecf3' },
];

export const paletteOf = (title: string): Palette => PALETTES[hash32(title) % PALETTES.length];
export const serialOf = (id: string): string => String(hash32(id) % 97).padStart(2, '0');

/* hero + footer stats */
export const TOTAL_MINUTES = META.totals.watchMinutes;
export const TOTAL_DHM = toDHM(TOTAL_MINUTES);
export const SPAN = (() => {
  const ts = ENTRIES.map((e) => Date.parse(e.addedAt));
  return { from: new Date(Math.min(...ts)), to: new Date(Math.max(...ts)) };
})();
