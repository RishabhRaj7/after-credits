import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Film, Tv, Star, Clock, CalendarPlus, CalendarDays, Gauge } from 'lucide-react';
import { PosterArt } from './Poster';
import { factLine, fmtDate, fmtDur, type Entry } from '../data/library';

export default function DetailPanel({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <AnimatePresence>
      {entry && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[92] bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            className="fixed inset-x-0 bottom-0 z-[93] max-h-[84vh] overflow-y-auto border-t border-line bg-coal md:inset-x-auto md:bottom-0 md:right-0 md:top-0 md:h-full md:max-h-none md:w-[440px] md:border-l md:border-t-0"
            initial={{ y: '60%', x: 0, opacity: 0 }}
            animate={{ y: 0, x: 0, opacity: 1 }}
            exit={{ y: '60%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            role="dialog"
            aria-label={entry.title}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-coal/95 px-5 py-3 backdrop-blur">
              <span className="font-tele text-[10px] tracking-[0.34em] text-dim">TITLE CARD</span>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 font-tele text-[10px] tracking-[0.2em] text-fog hover:text-bone"
              >
                CLOSE <X size={14} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-5">
                <div className="w-36 flex-none overflow-hidden rounded-sm border border-line shadow-[0_16px_40px_rgba(0,0,0,0.6)]" style={{ aspectRatio: '2/3' }}>
                  <PosterArt entry={entry} eager />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-tele text-[9.5px] tracking-[0.22em] text-ember">
                    {entry.type === 'movie' ? <Film size={11} /> : <Tv size={11} />}
                    {entry.type === 'movie' ? 'FILM' : 'SERIES'}
                    {entry.favorite && <Star size={11} className="fill-blood text-blood" />}
                  </div>
                  <h3 className="mt-1.5 font-display text-3xl uppercase leading-[0.95] text-bone">
                    {entry.title}
                  </h3>
                  {entry.originalTitle && entry.originalTitle !== entry.title && (
                    <div className="mt-1 text-xs italic text-fog">{entry.originalTitle}</div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {entry.genres.slice(0, 4).map((g) => (
                      <span key={g} className="border border-line px-1.5 py-0.5 font-tele text-[9px] tracking-[0.14em] text-fog">
                        {g.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2.5 border-t border-line pt-5 font-tele text-[11px] tracking-[0.08em]">
                <Row icon={CalendarPlus} k="LOGGED" v={fmtDate(entry.addedAt)} />
                <Row icon={CalendarDays} k="RELEASED" v={entry.releaseDate ? fmtDate(entry.releaseDate) : `${entry.year ?? '––––'}`} note={entry.releaseDateEstimated ? 'YEAR ONLY (OFFLINE)' : undefined} />
                <Row icon={Clock} k={entry.type === 'movie' ? 'RUNTIME' : 'EPISODES'} v={factLine(entry)} />
                {entry.watchMinutes != null && (
                  <Row icon={Gauge} k="WATCH COST" v={`≈ ${fmtDur(entry.watchMinutes)}${entry.watchEstimated ? ' (EST)' : ''}`} accent />
                )}
                <Row k="STATUS" v={entry.status.replace(/_/g, ' ').toUpperCase()} />
                {(entry.imdbId || entry.tmdbId) && (
                  <Row k="IDS" v={[
                    entry.tmdbId ? `TMDB ${entry.tmdbId}` : null,
                    entry.imdbId ?? null,
                  ].filter(Boolean).join(' · ')} dim />
                )}
              </div>

              {entry.voteAverage != null && (
                <div className="mt-5">
                  <div className="flex items-center justify-between font-tele text-[9.5px] tracking-[0.2em] text-dim">
                    <span>CROWD SCORE</span>
                    <span className="text-bone">{entry.voteAverage.toFixed(1)}</span>
                  </div>
                  <div className="mt-1.5 h-1 bg-smoke">
                    <div className="h-full bg-blood shadow-[0_0_8px_rgba(229,9,20,0.6)]" style={{ width: `${entry.voteAverage * 10}%` }} />
                  </div>
                </div>
              )}

              <p className="mt-6 text-sm leading-relaxed text-fog">
                {entry.overview ?? (
                  <span className="font-tele text-[10px] tracking-[0.06em] text-dim">
                    SYNOPSIS ARRIVES WITH TMDB ENRICHMENT — RUN{' '}
                    <span className="text-fog">TMDB_API_KEY=… node scripts/enrich.mjs</span>{' '}
                    AND REBUILD.
                  </span>
                )}
              </p>

              {entry.type === 'show' && (
                <p className="mt-4 border-t border-line pt-4 font-tele text-[9px] leading-relaxed tracking-[0.08em] text-dim">
                  {entry.episodesEstimated
                    ? 'EPISODE COUNT IS AN OFFLINE ESTIMATE — TMDB REPLACES IT WITH REAL NUMBERS.'
                    : 'SERIES TIME ≈ EPISODES × AVG EP LENGTH; ONGOING SHOWS UNDERCOUNT.'}
                </p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ icon: Icon, k, v, note, accent, dim }: {
  icon?: typeof Clock; k: string; v: string; note?: string; accent?: boolean; dim?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="flex items-center gap-2 text-[9.5px] tracking-[0.24em] text-dim">
        {Icon && <Icon size={11} />}
        {k}
      </span>
      <span className={`text-right ${accent ? 'text-ember' : dim ? 'text-dim' : 'text-bone'}`}>
        {v}
        {note && <span className="ml-2 text-[8.5px] text-dim">{note}</span>}
      </span>
    </div>
  );
}
