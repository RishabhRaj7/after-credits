/**
 * Shared watch-time math + entry shaping.
 * Movie  → runtime
 * Show   → episode_run_time × number_of_episodes (approximation: ongoing
 *          shows undercount until the tracker/TMDB reflects every episode)
 */

import { fnv1a } from './hash.mjs';

/**
 * Offline episode estimate: deterministic guess from the series' run length.
 * Flagged `episodesEstimated` so a TMDB-powered re-run replaces it with
 * real numbers and nothing here is mistaken for fact.
 */
export function estimateEpisodes(title, year, endYear) {
  const h = fnv1a(`${title}|${year}`);
  const runYears = Math.min(Math.max((endYear ?? 2026) - year + 1, 1), 30);
  // most acclaimed series run 1–6 seasons even across a long calendar span;
  // only genuinely long-runners ramp toward the cap
  const seasons = Math.min(Math.max(Math.round(runYears * (0.35 + ((h >> 3) % 45) / 100)), 1), Math.min(runYears, 12));
  const perSeason = 8 + ((h >> 8) % 7);           // 8–14 eps/season
  return Math.min(Math.max(seasons * perSeason + (h % 5), 8), 220);
}

export function makeId(type, title, year, addedAt) {
  return `${type}-${fnv1a(`${title}|${year}|${addedAt}`).toString(36)}`;
}

export function watchMinutesFor(entry) {
  if (entry.type === 'movie') {
    return entry.runtimeMinutes ?? null;
  }
  const ep = entry.episodeRunTime ?? null;
  const n = entry.numberOfEpisodes ?? null;
  if (!ep || !n) return null;
  return ep * n;
}
