/**
 * ─────────────────────────────────────────────────────────────────────────
 *  PIPELINE CONFIG — the single place to tune what counts as "watched".
 *  Change INCLUDED_STATUSES below and re-run any script; nothing else
 *  in the codebase reads status logic anywhere else.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Statuses that mean "actually engaged with" → included in the timeline.
 * Excluded by default:
 *   - 'for_later'  → queued, never started
 *   - anything with hidden_at set (see EXCLUDE_IF_HIDDEN below)
 */
export const INCLUDED_STATUSES = ['watching', 'following', 'stopped'];

/** If true, rows with a non-empty hidden_at are excluded regardless of status. */
export const EXCLUDE_IF_HIDDEN = true;

/* ── Paths ─────────────────────────────────────────────────────────────── */
export const PATHS = {
  csv: 'library.csv',
  out: 'data/enriched-library.json',
  cacheDir: 'scripts/.cache',
  tmdbCache: 'scripts/.cache/tmdb',
  sampleMap: 'scripts/.cache/sample-map.json',
  pool: 'scripts/.cache/seed-pool.json',
};

/* ── TMDB rate limiting (only used by enrich.mjs) ─────────────────────── */
export const TMDB = {
  base: 'https://api.themoviedb.org/3',
  delayMs: 130,          // delay between live requests (be gentle)
  maxRetries: 4,
  retryBaseMs: 1500,     // exponential backoff base for 429/5xx
  language: 'en-US',
};
