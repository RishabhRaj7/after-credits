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

**How it works.** A GitHub Gist (a small file hosted by GitHub) acts as the
live database. The site ships with the baked library
(`data/baked-library.json`); when any visitor opens the page it also reads
the gist and layers its changes on top — titles logged since the bake,
edits, removals. You write to the gist from the site itself, so a new title
is live on everyone's next page load with no commit and no rebuild.

- The gist only stores the *difference* from the bake, so it stays small.
- A gist title replaces the baked title it matches — by id, or by type +
  title + year — so nothing is ever listed twice.
- Anyone can read the gist; only your GitHub token can write to it, and the
  token never leaves your browser.

#### One-time setup (≈5 minutes)

**1 · Create the gist**

1. Sign in to GitHub and open <https://gist.github.com>.
2. *Filename including extension*: `after-credits-live.json` (exactly this).
3. Content: `{}`
4. Click **Create secret gist** (secret = unlisted; the site can still read
   it, it just isn't searchable). Public works too.
5. Copy the **gist id** — the long hex string at the end of the URL, e.g.
   `https://gist.github.com/<you>/`**`8f1c0d6e2b7a4c3d9e5f60718293a4b5`**.

**2 · Tell the site which gist to read** — `VITE_LIBRARY_GIST_ID`

The id is read at build time, so set it once and build/deploy once.

| where the site is built | what to do |
|---|---|
| **Vercel** | Project → Settings → Environment Variables → add `VITE_LIBRARY_GIST_ID` = your id (Production + Preview) → Deployments → ⋯ → **Redeploy** |
| **Netlify** | Site configuration → Environment variables → add `VITE_LIBRARY_GIST_ID` → Deploys → **Trigger deploy** |
| **Built locally** (e.g. you commit `dist/` and the host serves it as-is) | create `.env.local` in the project root with `VITE_LIBRARY_GIST_ID=your_id`, run `npm run build`, commit `dist/` |
| **Local dev** | same `.env.local`, then `npm run dev` |

`.env.local` is git-ignored. The id isn't secret, so you can also hard-code it
in `DEFAULT_GIST_ID` in `src/data/live.ts` instead.

**3 · Create a GitHub token that can only edit gists**

1. GitHub → avatar → **Settings** → **Developer settings** →
   **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
   (Fine-grained tokens can't write gists — it has to be classic.)
2. Note: `after-credits live log`. Expiration: your call (you'll re-paste it
   when it expires).
3. Scopes: tick **only `gist`**. Nothing else.
4. Generate and copy the token (`ghp_…`) — GitHub shows it once.

**4 · Get a TMDB key** (if you don't have one): <https://www.themoviedb.org/settings/api>
→ copy the **API Key (v3 auth)**.

**5 · Connect the site** — on your deployed site: footer → **Import data** →
**Quick log** → **Keys**: paste the TMDB key and the GitHub token. The panel
shows **Ready**. Both are stored in this browser's local storage only; repeat
on any other device you want to log from.

#### Day to day

1. Footer → **Import data** → **Quick log**.
2. Type what you watched; pick it from the TMDB results (a title already on
   the log is marked *On the log* — logging it again updates its date rather
   than adding a duplicate).
3. Set **Started watching** — the day you began the film or series (defaults to today), tick ♥ if it's a favourite.
4. **Log it**. Done — reload the page anywhere and it's there, poster,
   runtime, episodes and genres included.

Made a mistake? The list under the search removes live titles, and
**Edit library** edits or deletes any title (baked ones too) — saves publish
straight to the gist.

#### Once in a while: make live titles permanent ("fold" them into the bake)

Titles you log on the site live in the gist. They are already visible to every
visitor, so nothing breaks if you never do this — the gist can hold hundreds of
titles. Folding copies them into the repo itself (`data/baked-library.json`)
and moves their posters from TMDB's CDN into `public/posters/`, so the site no
longer depends on the gist for them. Every few months is plenty.

Run these from the **main project folder** (not a worktree).

**1 · Get the latest `main`**

```bash
git checkout main
git pull
```

**2 · Set the gist id and token for this terminal session** — the same
gist-scoped token you pasted into **Keys** on the site.

macOS / Linux / Git Bash:

```bash
export VITE_LIBRARY_GIST_ID=your_gist_id
export GITHUB_TOKEN=ghp_your_token
```

Windows PowerShell:

```powershell
$env:VITE_LIBRARY_GIST_ID="your_gist_id"; $env:GITHUB_TOKEN="ghp_your_token"
```

The id can be the bare id or the full `https://gist.github.com/...` URL.

**3 · Fold the gist into the bake**

```bash
npm run fold-live
```

This reads the gist, applies every addition, edit and deletion you made on the
site to `data/baked-library.json`, and downloads new posters. It ends with a
line like:

```
✓ Folded 1 changed/new and 0 removed titles → 355 in data/baked-library.json (1 posters downloaded).
```

The gist is left untouched at this point, so it is safe to re-run.

**4 · Rebuild and check locally**

```bash
npm run build
npm run serve
```

Open the address it prints and confirm the new titles appear with posters.

**5 · Commit and push**

```bash
git add data/baked-library.json public/posters dist
git commit -m "Fold live log into bake"
git push
```

If your host builds from the repo (Vercel / Netlify), the push deploys it.

**6 · Optional: empty the gist**

Once the deploy is live:

```bash
npm run fold-live -- --clear
```

This folds again (a no-op now) and then empties the gist, so it only holds what
you log from here on. `VITE_LIBRARY_GIST_ID` stays set on the host, so
**Log a title** keeps working against the empty gist. Skipping this step is
safe too — folded titles in the gist match the bake by id or by
type + title + year and are never shown twice.

**Troubleshooting**

- *"GitHub rejected the token"* — the token lacks the `gist` scope or expired;
  make a new classic token (step 3) and paste it in **Keys**.
- *"Gist not found"* — the id is wrong, or the token belongs to a different
  GitHub account than the gist.
- *New title not showing for visitors* — they need a reload; the site reads
  the gist once per page load. GitHub allows 60 anonymous reads per hour per
  visitor IP, far above normal browsing.
- *Quick log says live logging isn't switched on* — the build didn't see
  `VITE_LIBRARY_GIST_ID`; set it (step 2) and rebuild/redeploy.

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

- **Watched order** is `added_at` — the day each title was started.
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
