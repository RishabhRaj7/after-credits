import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Heart, Film, Tv, Calendar, Clock } from 'lucide-react';
import { Poster } from './Poster';
import { factLine, fmtDate, fmtDur, watchMinutes, type Entry, type Order } from '../data/library';

export default function DetailPanel({
  entry,
  order,
  onClose,
}: {
  entry: Entry | null;
  order: Order;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          className="detail-overlay fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            className="detail-panel relative w-full max-w-2xl overflow-hidden border border-line bg-coal shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
          >
            <div className="absolute inset-x-0 top-0 h-0.5 bg-blood" />
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center border border-line bg-ink/80 text-fog transition-colors hover:border-blood hover:text-bone"
              aria-label="Close"
            >
              <X size={14} />
            </button>
            <div className="flex flex-col sm:flex-row">
              <div className="relative w-40 shrink-0 sm:w-52">
                <Poster entry={entry} className="aspect-[2/3] w-full" />
              </div>
              <div className="flex-1 p-6 sm:p-7">
                <div className="font-tele text-[10px] tracking-[0.25em] text-blood">
                  {entry.type === 'movie' ? 'FEATURE' : 'SERIES'}
                  {entry.favorite && <span className="ml-3 inline-flex items-center gap-1 text-bone">· FAVORITE <Heart size={9} className="fill-blood text-blood" /></span>}
                </div>
                <h2 id="detail-title" className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-bone">
                  {entry.title}
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 font-tele text-[11px]">
                  <div className="flex items-center gap-2 text-fog">
                    {entry.type === 'movie' ? <Film size={12} className="text-dim" /> : <Tv size={12} className="text-dim" />}
                    {factLine(entry)}
                  </div>
                  <div className="flex items-center gap-2 text-fog">
                    <Clock size={12} className="text-dim" />
                    {watchMinutes(entry) ? `≈ ${fmtDur(watchMinutes(entry))}` : '—'}
                  </div>
                  <div className="flex items-center gap-2 text-fog">
                    <Calendar size={12} className="text-dim" />
                    {order === 'watch' ? 'LOGGED' : 'PREMIERE'} {fmtDate(order === 'watch' ? entry.addedAt : entry.releaseDate ?? entry.addedAt)}
                  </div>
                  <div className="flex items-center gap-2 text-fog">
                    <Calendar size={12} className="text-dim" />
                    {order === 'watch' ? 'PREMIERE' : 'LOGGED'} {fmtDate(order === 'watch' ? entry.releaseDate ?? entry.addedAt : entry.addedAt)}
                  </div>
                </div>
                {entry.genres && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {entry.genres.map((g) => (
                      <span key={g} className="border border-line px-2 py-0.5 font-tele text-[9px] tracking-[0.18em] text-dim">
                        {g.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
                {entry.overview && (
                  <p className="mt-4 text-sm leading-relaxed text-fog">{entry.overview}</p>
                )}
                <div className="mt-5 border-t border-line pt-3 font-tele text-[9px] tracking-[0.3em] text-dim">
                  {entry.year ?? '————'} · AFTER CREDITS ARCHIVE
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
