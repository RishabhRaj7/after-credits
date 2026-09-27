import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react';
import { Poster } from './Poster';
import { factLine, fmtDate, fmtDur, isEstimated, tmdbUrl, watchMinutes, type Entry, type Order } from '../data/library';

export default function DetailPanel({
  entry,
  sequence,
  order,
  totalMinutes,
  onSelect,
  onClose,
}: {
  entry: Entry | null;
  /** the current ordering, for position + prev/next */
  sequence: Entry[];
  order: Order;
  totalMinutes: number;
  onSelect: (e: Entry) => void;
  onClose: () => void;
}) {
  const idx = entry ? sequence.findIndex((e) => e.id === entry.id) : -1;
  const prev = idx > 0 ? sequence[idx - 1] : null;
  const next = idx >= 0 && idx < sequence.length - 1 ? sequence[idx + 1] : null;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && prev) onSelect(prev);
      if (e.key === 'ArrowRight' && next) onSelect(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entry, prev, next, onClose, onSelect]);

  const opened = !!entry;
  useEffect(() => {
    if (!opened) return;
    const last = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      last?.focus?.();
    };
  }, [opened]);

  const minutes = entry ? watchMinutes(entry) : 0;
  const share = (minutes / (totalMinutes || 1)) * 100;
  const link = entry ? tmdbUrl(entry) : null;

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 sm:items-center sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto overscroll-contain border border-line bg-coal"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="label text-[9.5px] text-dim">
                {idx >= 0 ? (
                  <>
                    <span className="text-bone">#{String(idx + 1).padStart(3, '0')}</span> of {sequence.length} ·{' '}
                    {order === 'watch' ? 'watched order' : 'release order'}
                  </>
                ) : (
                  'Outside the current filter'
                )}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => prev && onSelect(prev)} disabled={!prev} aria-label="Previous title" className="grid h-8 w-8 cursor-pointer place-items-center text-fog transition-colors hover:text-bone disabled:cursor-default disabled:opacity-25">
                  <ArrowLeft size={14} />
                </button>
                <button type="button" onClick={() => next && onSelect(next)} disabled={!next} aria-label="Next title" className="grid h-8 w-8 cursor-pointer place-items-center text-fog transition-colors hover:text-bone disabled:cursor-default disabled:opacity-25">
                  <ArrowRight size={14} />
                </button>
                <span className="mx-1 h-4 w-px bg-line" />
                <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 cursor-pointer place-items-center text-fog transition-colors hover:text-bone">
                  <X size={15} />
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="grid gap-6 p-5 sm:grid-cols-[200px_1fr] sm:gap-8 sm:p-7"
              >
                <Poster entry={entry} className="aspect-[2/3] w-32 outline outline-1 -outline-offset-1 outline-white/10 sm:w-full" />
                <div className="min-w-0">
                  <div className="label text-blood">{entry.type === 'movie' ? 'Feature film' : 'Series'}</div>
                  <h2 id="detail-title" className="mt-2 font-display text-[clamp(34px,5vw,54px)] font-extrabold uppercase leading-[0.9] text-bone">
                    {entry.title}
                  </h2>

                  <dl className="mt-6 grid grid-cols-2 gap-px border border-line bg-line">
                    {[
                      ['Logged', fmtDate(entry.addedAt)],
                      ['Premiered', fmtDate(entry.releaseDate)],
                      ['Format', factLine(entry)],
                      ['Time', `${isEstimated(entry) ? '≈ ' : ''}${fmtDur(minutes)} · ${share < 0.1 ? '<0.1' : share.toFixed(1)}% of all`],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-coal px-3 py-2.5">
                        <dt className="label text-[8.5px] text-dim">{k}</dt>
                        <dd className="mt-1 font-tele text-[11.5px] text-bone">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  {entry.genres && entry.genres.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {entry.genres.map((g) => (
                        <span key={g} className="label border border-line px-2 py-1 text-[9px] text-fog">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                  {entry.overview && <p className="mt-5 text-[15px] leading-relaxed text-fog">{entry.overview}</p>}
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="label mt-6 inline-flex items-center gap-1.5 text-fog transition-colors hover:text-bone"
                    >
                      View on TMDB <ArrowUpRight size={12} className="text-blood" />
                    </a>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
