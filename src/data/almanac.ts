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
}

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
  };
}
