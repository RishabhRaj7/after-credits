/* ── types ─────────────────────────────────────────────────────────────── */

export type EntryType = 'movie' | 'show';
export type Order = 'watch' | 'release';

export interface Entry {
  id: string;
  type: EntryType;
  title: string;
  year: number | null;
  addedAt: string; // ISO date — watch-order proxy
  releaseDate: string | null;
  favorite?: boolean;
  runtimeMinutes?: number; // movies
  episodes?: number; // shows
  episodeRuntime?: number; // shows (≈)
  episodesEstimated?: boolean;
  poster?: string; // tmdb path (no slash)
  overview?: string;
  genres?: string[];
}

export interface Cluster {
  items: Entry[];
  startTs: number;
  endTs: number;
  spanDays: number;
  size: number;
  minutes: number;
  binge: boolean;
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

/* ── the library ──────────────────────────────────────────────────────────
   `data/baked-library.json` is the committed source of truth — produced by
   `node scripts/bake.mjs` from your CSV (posters downloaded alongside into
   public/posters/). When it's empty the bundled sample below stands in. */

import bakedJson from '../../data/baked-library.json';

const E = (e: Entry) => e;

const SAMPLE_LIB: Entry[] = [
  E({ id: 'interstellar', type: 'movie', title: 'Interstellar', year: 2014, addedAt: '2019-02-11', releaseDate: '2014-11-05', runtimeMinutes: 169, favorite: true, poster: 'gEU2QniE6E77NI6lCU6MxlNBvIx', genres: ['Sci-Fi', 'Drama', 'Adventure'], overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity’s survival as Earth quietly dies.' }),
  E({ id: 'inception', type: 'movie', title: 'Inception', year: 2010, addedAt: '2019-02-12', releaseDate: '2010-07-15', runtimeMinutes: 148, genres: ['Sci-Fi', 'Thriller'], overview: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task: planting an idea.' }),
  E({ id: 'get-out', type: 'movie', title: 'Get Out', year: 2017, addedAt: '2019-06-21', releaseDate: '2017-02-24', runtimeMinutes: 104, poster: 'tFXcEccSQMf3lfhfXKSU9iRBpa3', genres: ['Horror', 'Thriller'] }),
  E({ id: 'shawshank', type: 'movie', title: 'The Shawshank Redemption', year: 1994, addedAt: '2019-11-03', releaseDate: '1994-09-23', runtimeMinutes: 142, poster: 'q6y0Go1tsGEsmtFryDOJo3dEmqu', genres: ['Drama'] }),

  E({ id: 'dark-knight', type: 'movie', title: 'The Dark Knight', year: 2008, addedAt: '2020-02-14', releaseDate: '2008-07-16', runtimeMinutes: 152, favorite: true, poster: 'qJ2tW6WMUDux911r6m7haRef0WH', genres: ['Action', 'Crime', 'Drama'], overview: 'When the menace known as the Joker wreaks havoc on Gotham, Batman must accept one of the greatest psychological tests of his ability to fight injustice.' }),
  E({ id: 'the-matrix', type: 'movie', title: 'The Matrix', year: 1999, addedAt: '2020-02-15', releaseDate: '1999-03-31', runtimeMinutes: 136, poster: 'f89U3ADr1oiB1s9GkdPOEpXUk5H', genres: ['Sci-Fi', 'Action'] }),
  E({ id: 'fight-club', type: 'movie', title: 'Fight Club', year: 1999, addedAt: '2020-02-15', releaseDate: '1999-10-15', runtimeMinutes: 139, poster: 'pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK', genres: ['Drama', 'Thriller'] }),
  E({ id: 'godfather', type: 'movie', title: 'The Godfather', year: 1972, addedAt: '2020-02-16', releaseDate: '1972-03-24', runtimeMinutes: 175, poster: '3bhkrj58Vtu7enYsRolD1fZdja1', genres: ['Crime', 'Drama'] }),
  E({ id: 'jojo-rabbit', type: 'movie', title: 'Jojo Rabbit', year: 2019, addedAt: '2020-08-09', releaseDate: '2019-10-18', runtimeMinutes: 108, poster: '7GsM4mtM0worCtIVeiQt28HieeN', genres: ['Comedy', 'Drama', 'War'] }),
  E({ id: 'la-la-land', type: 'movie', title: 'La La Land', year: 2016, addedAt: '2020-11-22', releaseDate: '2016-12-09', runtimeMinutes: 128, poster: 'uDO8zWDhfWwoFdKS4fzkUJt0Rf0', genres: ['Romance', 'Drama', 'Music'] }),

  E({ id: 'dune', type: 'movie', title: 'Dune', year: 2021, addedAt: '2021-02-05', releaseDate: '2021-09-15', runtimeMinutes: 155, favorite: true, poster: 'd5NXSklXo0qyIYkgV94XAgMIckC', genres: ['Sci-Fi', 'Adventure'], overview: 'Paul Atreides, a brilliant young heir to a noble house, is drawn to the desert planet Arrakis — the most dangerous place in the universe.' }),
  E({ id: 'stranger-things', type: 'show', title: 'Stranger Things', year: 2016, addedAt: '2021-02-06', releaseDate: '2016-07-15', episodes: 8, episodeRuntime: 51, episodesEstimated: true, poster: '49WJfeN0moxb9IPfGn8AIqMGskD', genres: ['Sci-Fi', 'Horror', 'Drama'] }),
  E({ id: 'grand-budapest', type: 'movie', title: 'The Grand Budapest Hotel', year: 2014, addedAt: '2021-02-07', releaseDate: '2014-03-07', runtimeMinutes: 99, poster: 'eWdyYQreja6JGCzqHWXpWHDrrPo', genres: ['Comedy', 'Drama'] }),
  E({ id: 'memento', type: 'movie', title: 'Memento', year: 2000, addedAt: '2021-02-07', releaseDate: '2000-10-11', runtimeMinutes: 113, poster: 'yuNs09hvpHVU1cBTCAk9zxsL2oW', genres: ['Mystery', 'Thriller'] }),
  E({ id: 'mad-max-fr', type: 'movie', title: 'Mad Max: Fury Road', year: 2015, addedAt: '2021-07-18', releaseDate: '2015-05-13', runtimeMinutes: 120, poster: '8tZYtuWezp8JbcsvHYO0O46tFbo', genres: ['Action', 'Adventure'] }),
  E({ id: 'joker', type: 'movie', title: 'Joker', year: 2019, addedAt: '2021-10-30', releaseDate: '2019-10-02', runtimeMinutes: 122, poster: 'udDclJoHjfjb8Ekgsd4FDteOkCU', genres: ['Drama', 'Thriller'] }),

  E({ id: 'the-batman', type: 'movie', title: 'The Batman', year: 2022, addedAt: '2022-04-19', releaseDate: '2022-03-01', runtimeMinutes: 176, favorite: true, poster: '74xTEgt7R36Fpooo50r9T25onhq', genres: ['Crime', 'Mystery'] }),
  E({ id: 'severance', type: 'show', title: 'Severance', year: 2022, addedAt: '2022-06-03', releaseDate: '2022-02-18', episodes: 9, episodeRuntime: 50, episodesEstimated: true, favorite: true, genres: ['Drama', 'Mystery', 'Sci-Fi'], overview: 'Mark leads a team whose memories have been surgically divided between their work and personal lives — until a colleague goes missing.' }),
  E({ id: 'eeaao', type: 'movie', title: 'Everything Everywhere All at Once', year: 2022, addedAt: '2022-06-04', releaseDate: '2022-03-25', runtimeMinutes: 139, poster: 'w3LxiVYdWWRvEVdn5RYq6jIqkb1', genres: ['Sci-Fi', 'Comedy', 'Drama'] }),
  E({ id: 'social-network', type: 'movie', title: 'The Social Network', year: 2010, addedAt: '2022-09-12', releaseDate: '2010-10-01', runtimeMinutes: 120, genres: ['Drama', 'Biography'] }),
  E({ id: 'the-menu', type: 'movie', title: 'The Menu', year: 2022, addedAt: '2022-12-23', releaseDate: '2022-11-18', runtimeMinutes: 107, genres: ['Thriller', 'Comedy'] }),
  E({ id: 'glass-onion', type: 'movie', title: 'Glass Onion', year: 2022, addedAt: '2022-12-23', releaseDate: '2022-11-23', runtimeMinutes: 139, genres: ['Mystery', 'Comedy'] }),

  E({ id: 'barbie', type: 'movie', title: 'Barbie', year: 2023, addedAt: '2023-07-21', releaseDate: '2023-07-19', runtimeMinutes: 114, favorite: true, poster: 'iuFNMS8U5cb6xfzi51Dbkovj7vM', genres: ['Comedy', 'Adventure'], overview: 'Barbie suffers a crisis that leads her to question her world and her existence.' }),
  E({ id: 'oppenheimer', type: 'movie', title: 'Oppenheimer', year: 2023, addedAt: '2023-07-21', releaseDate: '2023-07-19', runtimeMinutes: 180, genres: ['Drama', 'Biography', 'History'], overview: 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb during World War II.' }),
  E({ id: 'the-bear', type: 'show', title: 'The Bear', year: 2023, addedAt: '2023-08-14', releaseDate: '2022-06-23', episodes: 10, episodeRuntime: 30, episodesEstimated: true, genres: ['Drama', 'Comedy'] }),
  E({ id: 'parasite', type: 'movie', title: 'Parasite', year: 2019, addedAt: '2023-10-07', releaseDate: '2019-05-30', runtimeMinutes: 132, favorite: true, genres: ['Thriller', 'Drama', 'Comedy'], overview: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.' }),
  E({ id: '1917', type: 'movie', title: '1917', year: 2019, addedAt: '2023-10-08', releaseDate: '2019-12-25', runtimeMinutes: 119, genres: ['War', 'Drama'] }),
  E({ id: 'whiplash', type: 'movie', title: 'Whiplash', year: 2014, addedAt: '2023-11-19', releaseDate: '2014-10-10', runtimeMinutes: 107, genres: ['Drama', 'Music'], overview: 'A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing.' }),

  E({ id: 'shogun', type: 'show', title: 'Shōgun', year: 2024, addedAt: '2024-02-27', releaseDate: '2024-02-27', episodes: 10, episodeRuntime: 60, episodesEstimated: true, favorite: true, genres: ['Drama', 'History'], overview: 'In Japan in the year 1600, a mysterious European ship is shipwrecked in a fishing village, setting in motion events that will change the fate of a nation.' }),
  E({ id: 'true-detective-nc', type: 'show', title: 'True Detective: Night Country', year: 2024, addedAt: '2024-02-28', releaseDate: '2024-01-14', episodes: 6, episodeRuntime: 55, episodesEstimated: true, genres: ['Crime', 'Mystery'] }),
  E({ id: 'fallout', type: 'show', title: 'Fallout', year: 2024, addedAt: '2024-02-29', releaseDate: '2024-04-10', episodes: 8, episodeRuntime: 50, episodesEstimated: true, genres: ['Sci-Fi', 'Adventure'] }),
  E({ id: 'ripley', type: 'show', title: 'Ripley', year: 2024, addedAt: '2024-03-01', releaseDate: '2024-04-04', episodes: 8, episodeRuntime: 50, episodesEstimated: true, genres: ['Thriller', 'Drama'] }),
  E({ id: 'dune-part-two', type: 'movie', title: 'Dune: Part Two', year: 2024, addedAt: '2024-05-21', releaseDate: '2024-02-27', runtimeMinutes: 166, genres: ['Sci-Fi', 'Adventure'] }),
  E({ id: 'chernobyl', type: 'show', title: 'Chernobyl', year: 2019, addedAt: '2024-08-11', releaseDate: '2019-05-06', episodes: 5, episodeRuntime: 65, episodesEstimated: true, genres: ['Drama', 'History'] }),
  E({ id: 'queens-gambit', type: 'show', title: 'The Queen’s Gambit', year: 2020, addedAt: '2024-08-12', releaseDate: '2020-10-23', episodes: 7, episodeRuntime: 55, episodesEstimated: true, genres: ['Drama'] }),
  E({ id: 'dark', type: 'show', title: 'Dark', year: 2017, addedAt: '2024-11-02', releaseDate: '2017-12-01', episodes: 10, episodeRuntime: 50, episodesEstimated: true, genres: ['Sci-Fi', 'Mystery', 'Thriller'] }),
];

export const LIBRARY: Entry[] =
  (bakedJson as unknown as Entry[]).length > 0 ? (bakedJson as unknown as Entry[]) : SAMPLE_LIB;

/* ── formatting ────────────────────────────────────────────────────────── */

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const MONTHS_S = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '——';
  const d = new Date(iso + 'T00:00:00');
  return `${MONTHS_S[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`.toUpperCase();
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

export type TypeFilter = 'all' | 'movie' | 'show';

/* watch time with sensible fallbacks for incomplete rows:
   movies default to 120 min; show episodes default to 40 min each */
export function watchMinutes(e: Entry): number {
  if (e.type === 'movie') return e.runtimeMinutes ?? 120;
  return (e.episodes ?? 0) * (e.episodeRuntime ?? 40);
}

export function factLine(e: Entry): string {
  if (e.type === 'movie') return e.runtimeMinutes ? `${e.runtimeMinutes} MIN` : '— MIN';
  const est = e.episodesEstimated ? ' · EST' : '';
  return `${e.episodes ?? '—'} EP × ~${e.episodeRuntime ?? '—'} MIN${est}`;
}

export function sortKey(e: Entry, order: Order): number {
  const iso = order === 'watch' ? e.addedAt : (e.releaseDate ?? e.addedAt);
  return new Date(iso + 'T00:00:00').getTime();
}

export function sortedEntries(items: Entry[], order: Order): Entry[] {
  return [...items].sort((a, b) => sortKey(a, order) - sortKey(b, order));
}

/* ── clustering (Cluster & Burst) ──────────────────────────────────────── */

const DAY = 86400000;
const CLUSTER_GAP = 2 * DAY; // entries ≤2 days apart knot together

export function clusterize(items: Entry[], order: Order): Cluster[] {
  const sorted = sortedEntries(items, order);
  const clusters: Cluster[] = [];
  for (const e of sorted) {
    const ts = sortKey(e, order);
    const last = clusters[clusters.length - 1];
    if (last && ts - last.endTs <= CLUSTER_GAP) {
      last.items.push(e);
      last.endTs = ts;
    } else {
      clusters.push({ items: [e], startTs: ts, endTs: ts, spanDays: 1, size: 1, minutes: 0, binge: false });
    }
  }
  for (const c of clusters) {
    c.size = c.items.length;
    c.spanDays = Math.max(1, Math.round((c.endTs - c.startTs) / DAY) + 1);
    c.minutes = c.items.reduce((s, e) => s + watchMinutes(e), 0);
    c.binge = c.size >= 3;
  }
  return clusters;
}

export function headlineFor(size: number): string {
  if (size === 1) return 'Some stories deserve their own moment.';
  if (size === 2) return 'Two in a row. Obviously.';
  if (size === 3) return 'Three deep into the night.';
  return 'Just one more. Then another.';
}

export function intensityFor(size: number): { bars: number; label: string } | null {
  if (size < 3) return null;
  if (size >= 6) return { bars: 5, label: 'FULL BINGE MODE' };
  if (size >= 4) return { bars: 4, label: 'A LITTLE OBSESSED' };
  return { bars: 3, label: 'IN TOO DEEP' };
}

/* ── year grouping (The Reel) ──────────────────────────────────────────── */

export function groupByYear(items: Entry[], order: Order): YearGroup[] {
  const map = new Map<number, Entry[]>();
  for (const e of sortedEntries(items, order)) {
    const ts = sortKey(e, order);
    const y = new Date(ts).getFullYear();
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(e);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, list]) => ({
      year,
      items: list,
      minutes: list.reduce((s, e) => s + watchMinutes(e), 0),
    }));
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

export interface LibraryStats {
  days: number;
  hours: number;
  minutes: number;
  from: Date;
  to: Date;
  movies: number;
  shows: number;
  entries: number;
}

export function statsFor(items: Entry[]): LibraryStats {
  const min = totalMinutes(items);
  const added = items
    .map((e) => Date.parse(e.addedAt + 'T00:00:00Z'))
    .filter((n) => !Number.isNaN(n));
  const lo = added.length ? Math.min(...added) : Date.now();
  const hi = added.length ? Math.max(...added) : Date.now();
  return {
    days: Math.floor(min / 1440),
    hours: Math.floor((min % 1440) / 60),
    minutes: min % 60,
    from: new Date(lo),
    to: new Date(hi),
    movies: items.filter((e) => e.type === 'movie').length,
    shows: items.filter((e) => e.type === 'show').length,
    entries: items.length,
  };
}

/* ── original-header bindings ──────────────────────────────────────────── */

export const ENTRIES = LIBRARY;

export function orderedEntries(order: Order): Entry[] {
  return sortedEntries(LIBRARY, order);
}

const ALL_MIN = totalMinutes(LIBRARY);
export const TOTAL_DHM = {
  days: Math.floor(ALL_MIN / 1440),
  hours: Math.floor((ALL_MIN % 1440) / 60),
  minutes: ALL_MIN % 60,
};

const ADDED_MS = LIBRARY.map((e) => Date.parse(e.addedAt + 'T00:00:00Z'));
export const SPAN = {
  from: new Date(Math.min(...ADDED_MS)),
  to: new Date(Math.max(...ADDED_MS)),
};

export const META = {
  source: 'offline-seed',
  generatedAt: '2025-01-01T00:00:00Z',
  csvRows: LIBRARY.length,
  includedStatuses: ['watching', 'following', 'stopped'],
  excludeIfHidden: true,
  excludedForLater: 0,
  excludedHidden: 0,
  failures: [] as string[],
  totals: {
    movies: LIBRARY.filter((e) => e.type === 'movie').length,
    shows: LIBRARY.filter((e) => e.type === 'show').length,
    entries: LIBRARY.length,
  },
};
