import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import ParticleText from './ParticleText';
import GenreDial from './GenreDial';
import { fmtDur, fmtInt, fmtMonth, type Entry, type GenreCount, type LibraryStats } from '../data/library';

interface Props {
  entries: Entry[];
  stats: LibraryStats;
  genres: GenreCount[];
  onEnterLog: () => void;
  onAlmanac: () => void;
}

const rise = (d: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay: d, ease: [0.16, 1, 0.3, 1] as const },
});

const AUTO_MS = 6500;

export default function Hero({ entries, stats, genres, onEnterLog, onAlmanac }: Props) {
  const readouts = useMemo(() => {
    const films = entries.filter((e) => e.type === 'movie' && e.runtimeMinutes);
    const avgFilm = films.length ? films.reduce((s, e) => s + e.runtimeMinutes!, 0) / films.length : 0;
    const episodes = entries.reduce((s, e) => s + (e.type === 'show' ? (e.episodes ?? 0) : 0), 0);
    const y0 = stats.from.getFullYear();
    const y1 = stats.to.getFullYear();
    return [
      { lines: [`${stats.days} DAYS`], caption: 'of runtime, laid end to end' },
      { lines: [`${fmtInt(stats.hours)} HOURS`], caption: 'every film and every episode, counted once' },
      { lines: [`${stats.titles} TITLES`], caption: `logged ${fmtMonth(stats.from.getTime())} — ${fmtMonth(stats.to.getTime())}` },
      { lines: [`${stats.films} FILMS`], caption: `averaging ${fmtDur(avgFilm)} each` },
      { lines: [`${stats.series} SERIES`], caption: `${fmtInt(episodes)} episodes between them` },
      { lines: [`${y0}—${y1}`], caption: `${y1 - y0 + 1} years on the log` },
    ];
  }, [entries, stats]);

  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % readouts.length);
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [auto, readouts.length]);
  const pick = (i: number) => {
    setAuto(false);
    setIndex(i);
  };

  const shapes = useMemo(() => readouts.map((r) => r.lines), [readouts]);
  const current = readouts[index];

  return (
    <section id="top" className="relative border-b border-line">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
        {/* slate */}
        <motion.div
          {...rise(0)}
          className="label flex items-center justify-between gap-4 border-b border-line py-3 text-dim"
        >
          <span className="text-fog">A personal screening log</span>
          <span className="hidden sm:block">
            {stats.from.getFullYear()} — {stats.to.getFullYear()}
          </span>
          <span className="flex items-center gap-2">
            <span className="blink inline-block h-1.5 w-1.5 bg-blood" />
            Log 001
          </span>
        </motion.div>

        <div className="grid gap-12 pb-16 pt-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-10 lg:pb-20 lg:pt-14">
          <div className="min-w-0">
            <h1 className="sr-only">
              After Credits — {stats.days} days of film and television: {stats.titles} titles, {stats.films} films and{' '}
              {stats.series} series.
            </h1>

            <ParticleText
              shapes={shapes}
              index={index}
              onAdvance={() => pick((index + 1) % readouts.length)}
              className="-ml-1 h-[min(52vw,220px)] sm:h-[clamp(130px,19vw,300px)]"
            />

            {/* readout index */}
            <motion.div {...rise(0.5)} className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-4">
              <p className="label text-fog" aria-live="polite">
                <span className="text-blood">{String(index + 1).padStart(2, '0')}</span>
                <span className="mx-2 text-rule">/</span>
                {current.caption}
              </p>
              <div className="flex items-center gap-1" role="tablist" aria-label="Readouts">
                {readouts.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={r.lines.join(' ')}
                    onClick={() => pick(i)}
                    className="group grid h-7 w-7 cursor-pointer place-items-center"
                  >
                    <span
                      className={`block h-px transition-all duration-300 ${
                        i === index ? 'w-5 bg-blood' : 'w-2.5 bg-rule group-hover:w-4 group-hover:bg-fog'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.p {...rise(0.6)} className="mt-8 max-w-[58ch] text-[15px] leading-relaxed text-fog sm:text-base">
              Every film and series I have sat through since {stats.from.getFullYear()},{' '}
              <span className="text-bone">laid end to end</span>. Two ways to walk it: a winding track
              where binge weeks knot up and burst open, or a reel that counts it out year by year. Move
              across the numerals — they come apart.
            </motion.p>

            <motion.dl {...rise(0.7)} className="mt-10 grid grid-cols-2 border-l border-t border-line sm:grid-cols-4">
              {[
                ['Films', fmtInt(stats.films)],
                ['Series', fmtInt(stats.series)],
                ['Hours', fmtInt(stats.hours)],
                ['Genres', fmtInt(stats.genres)],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-r border-line px-4 py-3.5">
                  <dt className="label text-dim">{k}</dt>
                  <dd className="mt-1 font-display text-3xl font-bold leading-none text-bone">{v}</dd>
                </div>
              ))}
            </motion.dl>

            <motion.div {...rise(0.8)} className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <button
                type="button"
                onClick={onEnterLog}
                className="label group flex cursor-pointer items-center gap-3 border border-bone px-5 py-3.5 text-bone transition-colors hover:bg-bone hover:text-ink"
              >
                Enter the log
                <ArrowDown size={13} className="transition-transform group-hover:translate-y-0.5" />
              </button>
              <button
                type="button"
                onClick={onAlmanac}
                className="label group flex cursor-pointer items-center gap-2 text-fog transition-colors hover:text-bone"
              >
                Read the almanac
                <ArrowUpRight size={13} className="text-blood transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>
            </motion.div>

            <p className="label mt-8 max-w-[70ch] normal-case leading-relaxed tracking-[0.04em] text-dim">
              Runtime is an estimate: series count every episode on TMDB, so shows still airing — or
              abandoned part-way — can over- or under-state what was actually watched.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="min-w-0"
          >
            <GenreDial genres={genres} totalTitles={stats.titles} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
