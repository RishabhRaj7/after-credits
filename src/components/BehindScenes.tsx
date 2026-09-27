import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import { BACKLOG_MIN, FILM_FALLBACK, LONG_EPISODE, SHORT_EPISODE } from '../data/library';

const code = 'border border-line bg-ink px-1.5 py-0.5 font-tele text-[10.5px] text-bone';

function Note({ num, title, children }: { num: string; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-line py-7 sm:grid-cols-[120px_1fr] sm:gap-6">
      <div className="label text-dim">
        <span className="text-blood">{num}</span> {title}
      </div>
      <div className="space-y-3 text-[14px] leading-relaxed text-fog">{children}</div>
    </section>
  );
}

export default function BehindScenes({
  open,
  onClose,
  count,
  onManage,
}: {
  open: boolean;
  onClose: () => void;
  count: number;
  onManage: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex justify-end bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="notes-title"
            className="relative h-full w-full max-w-2xl overflow-y-auto overscroll-contain border-l border-line bg-coal px-5 pb-10 sm:px-10"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between border-b border-line bg-coal px-5 py-3 sm:-mx-10 sm:px-10">
              <span className="label text-blood">03 — Notes</span>
              <button type="button" onClick={onClose} aria-label="Close notes" className="grid h-8 w-8 cursor-pointer place-items-center text-fog transition-colors hover:text-bone">
                <X size={15} />
              </button>
            </div>

            <h2 id="notes-title" className="mt-10 font-display text-[clamp(44px,7vw,72px)] font-extrabold uppercase leading-[0.88] text-bone">
              Not a watchlist.
              <br />A time capsule<span className="text-blood">.</span>
            </h2>
            <p className="mt-6 max-w-[56ch] text-[15px] leading-relaxed text-fog">
              The films that kept me up and the series that kept me company — all {count} of them,
              threaded into one ongoing record and projected two ways.
            </p>

            <div className="mt-10">
              <Note num="01" title="Where it comes from">
                <p>
                  An export from a tracking app, one row per title, enriched from TMDB with posters,
                  runtimes, episode counts, genres and synopses. Everything ships inside the page — no
                  live API calls.
                </p>
              </Note>

              <Note num="02" title="What counts">
                <p>
                  Titles marked <span className={code}>watching</span>, <span className={code}>following</span>{' '}
                  or <span className={code}>stopped</span>. Anything queued for later or hidden is left out.
                </p>
              </Note>

              <Note num="03" title="The dates">
                <p>
                  Each title's date is the day I started watching it — the date it was added to the log — so{' '}
                  <em className="not-italic text-bone">watched order</em> is the order I started things in. Days where{' '}
                  {BACKLOG_MIN} or more titles were added at once are
                  treated as backlog days: shown honestly as a catch-up, and left out of the almanac's timing
                  stats.
                </p>
              </Note>

              <Note num="04" title="The runtime">
                <p>
                  Films count their runtime, {FILM_FALLBACK} min when unknown. Series count every episode
                  × episode length; where TMDB has no length, animation and comedy assume {SHORT_EPISODE} min
                  and everything else {LONG_EPISODE} min. It is an estimate of time spent, not proof of every
                  episode watched.
                </p>
              </Note>

              <Note num="05" title="Make it yours">
                <p>
                  Import your own export — same columns: <span className={code}>type, title, year, tmdb_id, list_status, added_at</span>{' '}
                  — with a free{' '}
                  <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-bone underline decoration-blood/60 underline-offset-4 hover:decoration-blood">
                    TMDB key <ArrowUpRight size={11} />
                  </a>
                  . It saves to the server when one is running, otherwise to this browser.
                </p>
                <button
                  type="button"
                  onClick={onManage}
                  className="label mt-2 cursor-pointer border border-bone px-4 py-2.5 text-bone transition-colors hover:bg-bone hover:text-ink"
                >
                  Open the data panel
                </button>
                <p>
                  To bake it in for every visitor: keep the export as <span className={code}>library.csv</span>, run{' '}
                  <span className={code}>TMDB_API_KEY=… node scripts/bake.mjs</span>, then{' '}
                  <span className={code}>npm run build</span>.
                </p>
              </Note>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
