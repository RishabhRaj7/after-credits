import { BACKLOG_MIN, dayTs, totalMinutes, watchMinutes, type Entry } from './library';

/* Facts for the almanac. Anything derived from log dates excludes backlog
   days (a dozen-plus titles logged at once), which record catching the log
   up rather than when something was watched. */

export interface Bar {
  key: string;
  label: string;
  value: number;
  /** part of `value` drawn as a stacked secondary share */
  secondary?: number;
  note?: string;
}

export interface Almanac {
  perYear: Bar[];
  backlogDays: { date: string; count: number }[];
  decades: Bar[];
  weekdays: Bar[];
  topWeekday: string;
  medianLagYears: number;
  freshCount: number;
  longestSeries: Entry | null;
  longestFilm: Entry | null;
  oldest: Entry | null;
  newest: Entry | null;
  filmMinutes: number;
  seriesMinutes: number;
  timeTravel: { entry: Entry; logTs: number; release: number }[];
  heatmap: { years: number[]; cells: number[][]; max: number };
  streak: { days: number; from: string; to: string };
  drought: { days: number; from: string; to: string };
  activeDays: number;
  medianGapDays: number;
  drift: { name: string; shares: { year: number; share: number }[]; overall: number }[];
  runtimes: Bar[];
  medianRuntime: number;
  medianRuntimeBin: string;
  episodes: number;
  medianEpisodes: number;
}

const DAY = 86400000;
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function buildAlmanac(entries: Entry[]): Almanac {
  const perDay = new Map<string, number>();
  for (const e of entries) perDay.set(e.addedAt, (perDay.get(e.addedAt) ?? 0) + 1);
  const backlogDays = [...perDay.entries()]
    .filter(([, n]) => n >= BACKLOG_MIN)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const backlog = new Set(backlogDays.map((d) => d.date));

  const years = new Map<number, { all: number; bulk: number }>();
  for (const e of entries) {
    const y = new Date(dayTs(e.addedAt)).getFullYear();
    const r = years.get(y) ?? { all: 0, bulk: 0 };
    r.all += 1;
    if (backlog.has(e.addedAt)) r.bulk += 1;
    years.set(y, r);
  }
  const perYear = [...years.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([y, r]) => ({
      key: String(y),
      label: `'${String(y).slice(2)}`,
      value: r.all,
      secondary: r.bulk,
      note: r.bulk ? `${r.bulk} from backlog days` : undefined,
    }));

  const decadeMap = new Map<number, number>();
  for (const e of entries) {
    const y = e.releaseDate ? Number(e.releaseDate.slice(0, 4)) : e.year;
    if (!y) continue;
    const d = Math.floor(y / 10) * 10;
    decadeMap.set(d, (decadeMap.get(d) ?? 0) + 1);
  }
  const decades = [...decadeMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([d, n]) => ({ key: String(d), label: `${d}s`, value: n }));

  const wd = [0, 0, 0, 0, 0, 0, 0];
  for (const e of entries) if (!backlog.has(e.addedAt)) wd[new Date(dayTs(e.addedAt)).getDay()] += 1;
  // Monday-first reads like a week
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];
  const weekdays = weekOrder.map((i) => ({ key: String(i), label: DAY_NAMES[i].slice(0, 1), value: wd[i], note: DAY_NAMES[i] }));
  const topWeekday = DAY_NAMES[wd.indexOf(Math.max(...wd))];

  const lags: number[] = [];
  let freshCount = 0;
  for (const e of entries) {
    if (!e.releaseDate) continue;
    const days = (dayTs(e.addedAt) - dayTs(e.releaseDate)) / 86400000;
    if (days < 0) continue;
    lags.push(days / 365.25);
    if (days <= 30) freshCount += 1;
  }
  lags.sort((a, b) => a - b);

  const byMinutes = (list: Entry[]) => [...list].sort((a, b) => watchMinutes(b) - watchMinutes(a))[0] ?? null;
  const films = entries.filter((e) => e.type === 'movie');
  const series = entries.filter((e) => e.type === 'show');
  const dated = entries.filter((e) => e.releaseDate).sort((a, b) => a.releaseDate!.localeCompare(b.releaseDate!));

  /* premiere vs log: how far back each title reached */
  const timeTravel = entries
    .filter((e) => e.releaseDate)
    .map((e) => {
      const r = new Date(dayTs(e.releaseDate!));
      return { entry: e, logTs: dayTs(e.addedAt), release: r.getFullYear() + r.getMonth() / 12 };
    });

  /* month × year, backlog days left out */
  const yearList = [...years.keys()].sort((a, b) => a - b);
  const cells = yearList.map(() => Array(12).fill(0) as number[]);
  for (const e of entries) {
    if (backlog.has(e.addedAt)) continue;
    const d = new Date(dayTs(e.addedAt));
    cells[yearList.indexOf(d.getFullYear())][d.getMonth()] += 1;
  }

  /* streaks and droughts across distinct log days */
  const logDays = [...perDay.keys()].sort();
  const dayNums = logDays.map((d) => Math.round(dayTs(d) / DAY));
  let streak = { days: 1, from: logDays[0] ?? '', to: logDays[0] ?? '' };
  let drought = { days: 0, from: '', to: '' };
  let runStart = 0;
  const gaps: number[] = [];
  for (let i = 1; i < dayNums.length; i++) {
    const gap = dayNums[i] - dayNums[i - 1];
    gaps.push(gap);
    if (gap !== 1) runStart = i;
    if (i - runStart + 1 > streak.days) streak = { days: i - runStart + 1, from: logDays[runStart], to: logDays[i] };
    if (gap > drought.days) drought = { days: gap, from: logDays[i - 1], to: logDays[i] };
  }

  /* genre drift: the top five genres' share of each year's titles */
  const tally = new Map<string, number>();
  for (const e of entries) for (const g of e.genres ?? []) tally.set(g, (tally.get(g) ?? 0) + 1);
  const top5 = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);
  const drift = top5.map((name) => ({
    name,
    overall: (tally.get(name) ?? 0) / Math.max(1, entries.length),
    shares: yearList.map((y) => {
      const inYear = entries.filter((e) => new Date(dayTs(e.addedAt)).getFullYear() === y);
      return { year: y, share: inYear.length ? inYear.filter((e) => (e.genres ?? []).includes(name)).length / inYear.length : 0 };
    }),
  }));

  /* film runtimes in 15-minute bins */
  const rts = films.map((e) => e.runtimeMinutes).filter((m): m is number => !!m);
  const edges = [0, 90, 105, 120, 135, 150, 165, Infinity];
  const runtimes = edges.slice(0, -1).map((lo, i) => {
    const hi = edges[i + 1];
    const label = lo === 0 ? '<90' : hi === Infinity ? `${lo}+` : `${lo}`;
    return { key: label, label, value: rts.filter((m) => m >= lo && m < hi).length, note: lo === 0 ? 'under 90 min' : hi === Infinity ? `${lo} min and over` : `${lo}–${hi} min` };
  });
  const medRt = median(rts);
  const medIdx = edges.findIndex((lo, i) => medRt >= lo && medRt < edges[i + 1]);
  const eps = series.map((e) => e.episodes ?? 0).filter(Boolean);

  return {
    perYear,
    backlogDays,
    decades,
    weekdays,
    topWeekday,
    medianLagYears: lags.length ? lags[lags.length >> 1] : 0,
    freshCount,
    longestSeries: byMinutes(series),
    longestFilm: byMinutes(films.filter((e) => e.runtimeMinutes)),
    oldest: dated[0] ?? null,
    newest: dated[dated.length - 1] ?? null,
    filmMinutes: totalMinutes(films),
    seriesMinutes: totalMinutes(series),
    timeTravel,
    heatmap: { years: yearList, cells, max: Math.max(1, ...cells.flat()) },
    streak,
    drought,
    activeDays: logDays.length,
    medianGapDays: median(gaps),
    drift,
    runtimes,
    medianRuntime: medRt,
    medianRuntimeBin: runtimes[Math.max(0, medIdx)]?.key ?? '',
    episodes: eps.reduce((a, b) => a + b, 0),
    medianEpisodes: median(eps),
  };
}
