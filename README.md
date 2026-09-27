# AFTER CREDITS — a personal screening log

Every film and series I've watched, laid end to end. A single page, dark and
typographic: the headline numbers are printed in particles, the library is read
back as an almanac, and the log itself can be projected two ways.

- **Hero** — a particle readout that cycles through the library's numbers (days,
  hours, titles, films, series, span). Move across it and the points scatter;
  click to advance. Beside it, a radial bar chart of titles by genre.
- **Almanac** — titles logged per year (backlog days separated out), release
  decades, screening day, the median gap between premiere and log, where the
  time went, and the longest, oldest and newest titles.
- **The log** — one sticky control deck drives both projections:
  - **Cluster & Burst**: a winding track. Single nights sit alone, runs of a few
    titles fan open as you scroll, and big clusters lay out as a contact sheet.
  - **The Reel**: every title in line, year by year, on a spine whose width
    carries each year's density, with decade intermissions and a seek rail.
  - Filter by type and year/decade, flip watched ⇄ release order and oldest ⇄
    newest. Selections persist across both views.
- **Title card** — click any poster: facts, synopsis, share of total time, TMDB
  link, and ← → to step through the current sequence.
- **Search** — press `/` (or ⌘K / Ctrl+K) to find any title.

## Quick start

```bash
npm install
npm run dev          # local preview
npm run build        # typecheck + static single-file site → dist/
npm run serve        # optional: serve dist/ with the library store API
```

The library is baked in at build time from `data/baked-library.json`; posters
live in `public/posters/`. No runtime API calls.

## Data

### Log new titles live — no commit, no redeploy

A GitHub Gist acts as the live database. The site loads the baked library,
then layers the gist's changes over it for every visitor. You add titles
from the site itself.

**One-time setup**

1. Create a gist at <https://gist.github.com> with one file named
   `after-credits-live.json` containing `{}` (secret is fine).
2. Put the gist id (the hash in its URL) in your host's environment as
   `VITE_LIBRARY_GIST_ID` (or in `.env.local` for local dev) and deploy once.
3. Create a GitHub token with only the **gist** scope
   (Settings → Developer settings → Tokens (classic)).
4. On the site: footer → **Import data** → **Quick log** → *Keys*: paste the
   token and your TMDB key. Both stay in that browser only.

**Day to day:** Quick log → type the title → pick it → set the date → **Log it**.
It's live for every visitor on their next page load. Edits and deletes in
**Edit library** publish the same way. Visitors can read the gist but only
your token can write to it.

**Now and then** fold the live titles into the bake (downloads their posters):

```bash
VITE_LIBRARY_GIST_ID=<id> GITHUB_TOKEN=<token> npm run fold-live -- --clear
npm run build   # then commit
```

### Bake your export (permanent, for every visitor)

```bash
TMDB_API_KEY=your_v3_key npm run bake       # or TMDB_READ_ACCESS_TOKEN=…
npm run build
```

`scripts/bake.mjs` reads `library.csv`, keeps rows whose `list_status` is
`watching`, `following` or `stopped` (and not hidden), enriches each from TMDB
and downloads its poster. Flags: `--limit 10`, `--no-posters`, `--csv path`.

Expected columns (a BOM is fine):

```
type, title, original_title, year, tvdb_id, tmdb_id, favorite,
list_status, added_at, for_later_at, stopped_watching_at, hidden_at
```

### Full refresh pipeline (first run / re-seeding)

The original seeding pipeline is kept for a from-scratch data refresh:

```bash
node scripts/build-pool.mjs          # once: IMDb public datasets → curated pool (offline runtimes)
node scripts/seed-offline.mjs        # library.csv → data/enriched-library.json, no key needed
TMDB_API_KEY=your_v3_key npm run enrich   # enrich from TMDB (cached in scripts/.cache/tmdb)
```

Which statuses count lives in one place: `scripts/lib/config.mjs`. Titles
without a runtime get an average duration, flagged as estimated. `enrich.mjs`
merges rather than clobbers, re-runs only fetch what's new, and lookup
failures are recorded in `meta.failures` instead of being dropped.

### Import in the browser (no rebuild)

Footer → **Import data**: drop in the CSV with a TMDB key. The result is stored
on the server when `npm run serve` is running, otherwise in the browser. The
**Edit library** tab fixes individual titles and exports corrected JSON to
replace `data/baked-library.json`.

## How the numbers are counted

| | watch time |
|---|---|
| film | runtime · 120 min when unknown |
| series | episodes × episode length · when TMDB has no length: 24 min for animation and straight comedy, 45 min otherwise |

- **Watched order** is `added_at` — the export has no watch date.
- **Backlog days** — a day with 12+ titles logged is treated as catching the
  record up, not a binge: labelled as such in the log and excluded from the
  almanac's timing stats.
- TMDB's TV and film genre names are merged (e.g. "Sci-Fi & Fantasy" and
  "Science Fiction" → Sci-Fi, Fantasy) so the genre dial counts each once.
- Series count every episode listed on TMDB, so shows still airing or dropped
  part-way can over- or under-count.

## Stack

Vite + React 19 + Tailwind 4 + Framer Motion, built into a single HTML file
(`vite-plugin-singlefile`). The particle engine (`src/lib/particles.ts`) is
plain canvas 2D, shared with The Daily Index; it pauses off-screen and renders
one static frame for reduced-motion readers. Fonts: Big Shoulders Display,
Archivo, JetBrains Mono.

```
src/
  App.tsx                 state, filter pipeline, page composition
  data/library.ts         types, genre normalisation, watch time, clustering
  data/almanac.ts         derived facts for the almanac
  data/importer.ts        CSV parsing, TMDB enrichment, persistence
  data/live.ts            live gist: read, diff, publish
  lib/particles.ts        particle engine
  components/             Hero, GenreDial, Almanac, ControlDeck, DetailPanel,
                          SearchPalette, Footer, panels…
  views/                  ClusterBurst, MobileTrack, Reel
scripts/bake.mjs          CSV → baked JSON + posters
scripts/fold-live.mjs     live gist → baked JSON + posters
scripts/enrich.mjs, seed-offline.mjs, build-pool.mjs, lib/   full refresh pipeline
server.mjs                zero-dependency static server + /api/library store
```

Metadata and posters via [TMDB](https://www.themoviedb.org). This product uses
the TMDB API but is not endorsed or certified by TMDB.
