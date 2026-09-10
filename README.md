# WATCH LOG — a personal screening history

A single-page, scrollable timeline of everything you've watched — not a
dashboard, not a spreadsheet with posters. Dark, poster-forward, cinematic.
Two selectable projections of the same data share one hero and one
live-counting watch-time total:

- **CLUSTER & BURST** — the history as a winding track. Quiet stretches coast
  past as single posters; binge weeks knot up and *detonate* into a fan of
  posters as you scroll through them. The line draws itself in.
- **THE REEL** — a central spine whose thickness and glow scale with each
  year's watch density, stacked odometer year numerals that roll into place,
  alternating left/right title blocks, full-bleed decade **intermissions**,
  sticky multi-select year/decade filters that physically shorten the page,
  and a seek-bar scrubber rail on the edge of the screen.

Shared across both: an order toggle (**watched order** = `added_at`, vs
**release order** = TMDB premiere date — true reflow, no reload), a ~2×
spring poster zoom on hover, click-to-expand title cards, and a
**CUT TO:** film-splice wipe when you change views mid-visit.

## Quick start

```bash
npm install
npm run build        # static site → dist/ (deploy Vercel/Netlify/any static host)
npm run dev          # local preview
```

The site bakes `data/enriched-library.json` in at build time. **No backend,
no runtime API calls, no loading spinners.**

## The data pipeline (build-time only)

```
library.csv ──► filter by list_status ──► enrich ──► data/enriched-library.json
                                              │
                                    TMDB (with a key)   or   offline seed (no key)
```

### 1 · Drop in your export

Replace the generated sample `library.csv` with your real export. Expected
columns (BOM at the start of the file is fine — the parser strips it):

```
type, title, original_title, year, tvdb_id, tmdb_id, favorite,
list_status, added_at, for_later_at, stopped_watching_at, hidden_at
```

There is **no "date watched" field** by design — `added_at` is used as the
watch-order proxy everywhere (nothing is faked). `year` is release year.
`tmdb_id` is the primary identifier for both movies and shows; `tvdb_id`
(shows only) is kept in the data but unused — TMDB is the source for both.

### 2 · Choose which statuses count as "watched" — ONE place

**`scripts/lib/config.mjs`**:

```js
export const INCLUDED_STATUSES = ['watching', 'following', 'stopped'];
export const EXCLUDE_IF_HIDDEN = true;
```

`for_later` (queued, never started) and anything with `hidden_at` set are
excluded by default. Change that one array and re-run the pipeline — no
other file touches status logic.

### 3a · Enrich from TMDB (real posters + exact numbers)

```bash
TMDB_API_KEY=YOUR_V3_KEY      node scripts/enrich.mjs
# or the v4 read token:
TMDB_READ_ACCESS_TOKEN=XXXX   node scripts/enrich.mjs
```

Free key: <https://www.themoviedb.org/settings/api>

- Looks up `/movie/{tmdb_id}` or `/tv/{tmdb_id}`; falls back to title+year
  **search** when the id is missing (keeps partial exports usable).
- Fetches poster/backdrop path, release/first-air date, genres, overview,
  runtime (movies) and `episode_run_time` + `number_of_episodes` (shows).
- ~130 ms between live calls, 429/5xx retried with backoff, aggressive disk
  cache in `scripts/.cache/tmdb/` — re-runs only fetch what's new.
- **Failures are flagged, never silently dropped**: entries get
  `flags: ['tmdb-lookup-failed']` and land in `meta.failures` for inspection.
- The key stays server-side — it never appears in client code or the output
  JSON. `--limit=8` for a smoke test, `--dry` to just print the filter report,
  `--force` to ignore cache.

### 3b · No key? Offline seed (what the committed data uses right now)

```bash
node scripts/build-pool.mjs     # once: IMDb public datasets → curated pool
node scripts/build-sample.mjs   # optional: regenerate the sample library.csv
node scripts/seed-offline.mjs   # library.csv → data/enriched-library.json
```

- **Movie runtimes are real** (IMDb). **Show episode counts are estimated** —
  every such entry is flagged `episodesEstimated: true`, and the estimate is
  labeled in the UI. Re-run 3a with a TMDB key and real numbers + posters
  replace it (the enrich step merges, it doesn't clobber).
- With no poster paths available, the UI renders deterministic typographic
  title cards (palette hashed per-title) — real posters slot in automatically.

### Watch-time math

| type  | total watch time                                   |
|-------|----------------------------------------------------|
| movie | `runtime`                                          |
| show  | `episode_run_time[0] × number_of_episodes`         |

Shows are labeled an **approximation** (ongoing series undercount until all
episodes are reflected); the hero prints the caveat next to the counter.

## Stack

Vite + React 19 + Tailwind 4 + Framer Motion, TanStack-free: instead of
virtualization the long reel leans on native `content-visibility: auto` +
section-level collapse animations so filter toggles stay smooth with the full
600+ title set loaded. Framer MotionValue-driven transforms for all
scroll-linked motion (zero React re-renders on scroll).

## Controls cheat-sheet

| control | where | effect |
|---|---|---|
| TOTAL RUNTIME counter | hero | counts 0 → real days/hrs/min on entry |
| SEQUENCE toggle | hero + top bar | watched order ⇄ release order, true reflow |
| PROJECTION switch | hero + top bar | CUT TO: wipe between Cluster & Burst ⇄ The Reel |
| poster hover | both views | ~2× spring zoom, neighbors give way |
| poster click | both views | title card panel (facts + TMDB synopsis when enriched) |
| REEL FILTER chips | The Reel (sticky) | deselect a year/decade → reel collapses live, page literally shortens |
| seek rail | The Reel (right edge) | one dot per year, click to scrub |
