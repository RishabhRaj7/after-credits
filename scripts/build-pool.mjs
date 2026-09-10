/**
 * build-pool.mjs — builds scripts/.cache/seed-pool.json from IMDb's public
 * datasets (https://datasets.imdbws.com). No API key required.
 *
 * The pool is the universe of "famous enough that a real person would have
 * watched it" titles used to curate the sample library.csv. It is NOT the
 * data pipeline for your real export — that's enrich.mjs (TMDB).
 *
 *   node scripts/build-pool.mjs
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { execSync } from 'node:child_process';
import { PATHS } from './lib/config.mjs';

const MIN_VOTES = 22000;          // fame threshold — keeps the pool "watchable"
const MIN_YEAR = 1950;
const BASICS_URL = 'https://datasets.imdbws.com/title.basics.tsv.gz';
const RATINGS_URL = 'https://datasets.imdbws.com/title.ratings.tsv.gz';

const cache = PATHS.cacheDir;
mkdirSync(cache, { recursive: true });
mkdirSync(PATHS.tmdbCache, { recursive: true });

function download(url, dest) {
  if (existsSync(dest)) { console.log(`  cached: ${dest}`); return; }
  console.log(`  downloading ${url}`);
  execSync(`curl -sL --retry 3 -o "${dest}" "${url}"`, { stdio: 'inherit' });
}

console.log('1/4 fetching datasets');
download(RATINGS_URL, `${cache}/title.ratings.tsv.gz`);
download(BASICS_URL, `${cache}/title.basics.tsv.gz`);

console.log('2/4 reading ratings');
const votes = new Map();
{
  const rl = createInterface({
    input: createReadStream(`${cache}/title.ratings.tsv.gz`).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  let head = true;
  for await (const line of rl) {
    if (head) { head = false; continue; }
    const tab1 = line.indexOf('\t');
    const tab2 = line.indexOf('\t', tab1 + 1);
    const v = Number(line.slice(tab2 + 1));
    if (v >= MIN_VOTES) votes.set(line.slice(0, tab1), [v, Number(line.slice(tab1 + 1, tab2))]);
  }
}
console.log(`  ${votes.size.toLocaleString()} titles above ${MIN_VOTES.toLocaleString()} votes`);

console.log('3/4 streaming basics (14M+ rows, one pass)');
const pool = [];
{
  const rl = createInterface({
    input: createReadStream(`${cache}/title.basics.tsv.gz`).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  let head = true;
  for await (const line of rl) {
    if (head) { head = false; continue; }
    // tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres
    const p = line.split('\t');
    const hit = votes.get(p[0]);
    if (!hit) continue;
    const type = p[1];
    if (type !== 'movie' && type !== 'tvSeries' && type !== 'tvMiniSeries') continue;
    if (p[4] !== '0') continue;                       // isAdult
    if (p[5] === '\\N' || Number(p[5]) < MIN_YEAR) continue;
    if (p[7] === '\\N') continue;                     // runtimeMinutes required
    pool.push({
      imdb: p[0],
      kind: type === 'movie' ? 'movie' : 'show',
      title: p[2],
      original: p[3] === '\\N' ? p[2] : p[3],
      year: Number(p[5]),
      endYear: p[6] === '\\N' ? null : Number(p[6]),
      runtime: Number(p[7]),
      genres: p[8] === '\\N' ? [] : p[8].split(','),
      votes: hit[0],
      rating: hit[1],
    });
  }
}
pool.sort((a, b) => b.votes - a.votes);

console.log(`4/4 writing pool: ${pool.length.toLocaleString()} titles`);
writeFileSync(PATHS.pool, JSON.stringify(pool));
console.log(`  → ${PATHS.pool}`);
