import { fmtDur, fmtInt, type Cluster, type Entry, type Order } from './library';

/* Captions for the Cluster & Burst track. Each one names what's actually in
   the knot — the titles, the runtime, the genre mix — and picks a line
   deterministically from the cluster's key so it never reshuffles on scroll. */

export interface Quip {
  headline: string;
  aside?: string;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const pick = <T,>(list: T[], key: string) => list[hash(key) % list.length];

function short(title: string, max = 30): string {
  const t = title.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

const days = (n: number) => (n === 1 ? 'one day' : `${n} days`);

const has = (e: Entry, g: string) => (e.genres ?? []).includes(g);
const share = (items: Entry[], g: string) => items.filter((e) => has(e, g)).length / items.length;

function dominantGenre(items: Entry[]): string | null {
  const tally = new Map<string, number>();
  for (const e of items) for (const g of e.genres ?? []) tally.set(g, (tally.get(g) ?? 0) + 1);
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

function solo(e: Entry, key: string): string {
  const T = short(e.title);
  if (e.type === 'show') {
    const eps = e.episodes ?? 0;
    if (eps >= 150) return pick([`${T}: ${eps} episodes. "Just the pilot," they said.`, `${T}. ${eps} episodes. This was a relationship.`], key);
    if (eps >= 40) return pick([`${T}. ${eps} episodes deep. Sleep is a construct.`, `${T}: ${eps} episodes, one "next episode" button.`], key);
    if (has(e, 'Animation')) return `${T}. Subtitles on, social life off.`;
    return pick([`${T}. "One more episode" became all of them.`, `${T}, start to finish. Autoplay did the rest.`], key);
  }
  if (has(e, 'Horror')) return `${T}. The lights stayed on afterwards.`;
  if (has(e, 'Romance')) return `${T}. Nobody saw anything. Nobody cried.`;
  if (has(e, 'Documentary')) return `${T}. Technically, that counts as studying.`;
  if (has(e, 'Animation')) return `${T}. Cartoons are for adults, actually.`;
  if ((e.runtimeMinutes ?? 0) >= 165) return `${T}. ${fmtDur(e.runtimeMinutes!)}. Bladder of steel.`;
  if (has(e, 'Comedy')) return `Laughed at ${T}. Out loud. Alone.`;
  return pick([
    `Just you and ${T}. Phone face-down. Allegedly.`,
    `${T}, credits and all. Obviously.`,
    `A quiet night in with ${T}.`,
    `${T}. No second screen. Mostly.`,
  ], key);
}

export function quipFor(c: Cluster, order: Order): Quip {
  const items = c.items;
  const n = items.length;
  const A = short(items[0].title, 26);
  const B = n > 1 ? short(items[1].title, 26) : '';
  const Z = short(items[n - 1].title, 26);
  const hours = fmtInt(c.minutes / 60);

  if (order === 'release') {
    if (n === 1) return { headline: `${short(items[0].title)} premiered with the week to itself.` };
    if (n === 2) return { headline: `${A} and ${B} opened the same week. Pick a side.` };
    return { headline: pick([`${n} premieres in ${days(c.spanDays)}. Studios, please coordinate.`, `A crowded release window: ${A}, ${B} and ${n - 2} more.`], c.key) };
  }

  if (c.kind === 'backlog') {
    return {
      headline: 'The backlog, logged in one sitting.',
      aside: `Mostly logged on a single day — catching the record up, not a ${n}-title binge. They sit here by log date; switch to Released to scatter them back across the years.`,
    };
  }
  if (n === 1) return { headline: solo(items[0], c.key) };

  const g0 = dominantGenre([items[0]]);
  const g1 = dominantGenre([items[1]]);
  if (n === 2) {
    if (g0 && g1 && g0 !== g1 && hash(c.key) % 2 === 0) return { headline: `${A}, then ${B}. From ${g0} to ${g1}. Range.` };
    return {
      headline: pick([
        `${A}, then ${B}. A double feature nobody scheduled.`,
        `${A} and ${B}, back to back. No intermission.`,
        `${A}? Fine. ${B}? Also fine. Clearly.`,
      ], c.key),
    };
  }

  if (share(items, 'Animation') >= 0.6) return { headline: `${n} anime titles in ${days(c.spanDays)}. Subtitles on, social life off.`, aside: `Opened with ${A}. Closed with ${Z}.` };
  if (share(items, 'Horror') >= 0.5) return { headline: `${n} horror titles in a row. Sleep was a rumour.` };
  if (c.minutes >= 60 * 60) return { headline: `${hours} hours of screen time, queued in ${days(c.spanDays)}. Sunlight was optional.`, aside: `Started with ${A}. Lost track somewhere around ${Z}.` };
  return {
    headline: pick([
      `${A}, ${B} and ${n - 2} more. Outside can wait.`,
      `Started with ${A}. Ended with ${Z}. Regrets: none.`,
      `${n} titles, ${hours} hours. "Just one more," ${n - 1} times.`,
    ], c.key),
    aside: n > 3 ? `Dominant mood: ${dominantGenre(items) ?? 'mixed'}.` : undefined,
  };
}
