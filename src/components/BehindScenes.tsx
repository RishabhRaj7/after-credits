import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  Check,
  Clapperboard,
  ListChecks,
  Package,
  Timer,
  Upload,
  X,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  count: number;
}

const code =
  'border border-line bg-ink px-1.5 py-0.5 font-tele text-[10px] tracking-[0.04em] text-bone';

function SectionHead({ icon: Icon, children }: { icon: typeof Timer; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-blood" />
      <h3 className="text-[15px] font-bold tracking-tight text-bone">{children}</h3>
    </div>
  );
}

export default function BehindScenes({ open, onClose, count }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="chrome-orig relative my-auto w-full max-w-2xl border border-line bg-coal p-6 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95)] sm:p-9"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line text-dim transition-colors hover:border-blood/60 hover:text-bone"
            >
              <X size={14} />
            </button>

            <div className="flex items-center gap-2 font-tele text-[10px] tracking-[0.34em] text-blood">
              <Clapperboard size={13} /> BEHIND THE SCENES
            </div>

            <h2 className="mt-4 font-display text-5xl uppercase leading-[0.92] tracking-wide text-bone sm:text-6xl">
              Not just a watchlist.
              <br />
              A little time capsule<span className="text-blood">.</span>
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-fog">
              The films that kept you up. The series that kept you company. After Credits threads
              all {count} of them into one ongoing story — two projections of the same history.
            </p>

            {/* make it yours */}
            <div className="mt-6 border border-blood/40 bg-blood/[0.07] p-5">
              <div className="flex items-center gap-2">
                <Upload size={14} className="text-blood" />
                <span className="text-[13px] font-bold text-bone">This screen is replaceable</span>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-fog">
                Every title, date and poster you're seeing is swappable data — nothing is
                hard-coded. Upload your own history and this whole site becomes yours in a couple
                of minutes.
              </p>
            </div>

            <div className="my-7 h-px bg-line" />

            {/* upload route */}
            <SectionHead icon={Upload}>Make it yours — right here, no code</SectionHead>
            <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-[13px] leading-relaxed text-fog marker:font-tele marker:text-[11px] marker:text-dim">
              <li>
                Open the DATA panel — the <span className={code}>IMPORT</span> button in the top
                bar (shows once you scroll) or <span className={code}>IMPORT DATA</span> in the
                footer.
              </li>
              <li>
                Drop in (or paste) your tracking export — the same columns this site reads:{' '}
                <span className={code}>type, title, year, tmdb_id, list_status, added_at</span> —
                and add a free{' '}
                <a
                  href="https://www.themoviedb.org/settings/api"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-bone underline decoration-blood/60 underline-offset-4 transition-colors hover:text-blood"
                >
                  TMDB key <ArrowUpRight size={11} />
                </a>
                .
              </li>
              <li>
                Hit <span className={code}>IMPORT</span>. The site fetches posters, runtimes and
                synopses for every row and swaps this sample for your history — stored on the
                server when one is running, otherwise in your browser.
              </li>
            </ol>
            <p className="mt-4 text-[13px] leading-relaxed text-fog">
              Bad year? Missing runtime? The <span className={code}>EDIT LIBRARY</span> tab in the
              same panel lets you fix any title in place and export the corrected data.
            </p>

            <div className="my-7 h-px bg-line" />

            {/* permanent route */}
            <SectionHead icon={Package}>Want it permanent for every visitor?</SectionHead>
            <p className="mt-4 text-[13px] leading-relaxed text-fog">
              Bake your data into the site itself: keep your export as{' '}
              <span className={code}>library.csv</span> in the project, run{' '}
              <span className={code}>TMDB_API_KEY=your_key node scripts/bake.mjs</span>, then{' '}
              <span className={code}>npm run build</span> and commit. Posters download as real
              files and the enriched JSON ships inside the page — no backend, no live requests.
            </p>

            <div className="my-7 h-px bg-line" />

            {/* what counts */}
            <SectionHead icon={ListChecks}>What counts as a story?</SectionHead>
            <div className="mt-4 flex flex-wrap gap-2">
              {['watching', 'following', 'stopped'].map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1.5 border border-blood/50 px-3 py-1.5 font-tele text-[10px] tracking-[0.1em] text-bone"
                >
                  <Check size={11} className="text-blood" strokeWidth={3} /> {s}
                </span>
              ))}
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-fog">
              Queued-for-later and hidden titles are always excluded. Change the included statuses
              in the <span className={code}>INCLUDED</span> set inside{' '}
              <span className={code}>scripts/bake.mjs</span>, then re-run the bake.
            </p>

            <div className="my-7 h-px bg-line" />

            {/* movie math */}
            <SectionHead icon={Timer}>A note on movie math</SectionHead>
            <p className="mt-4 text-[13px] leading-relaxed text-fog">
              Films use their runtime — <span className={code}>120 min</span> when unknown. Series
              use <span className={code}>episodes × episode_runtime</span>, defaulting to{' '}
              <span className={code}>40 min</span> per episode when missing. It's an approximation,
              not proof of completed watches; ongoing series may undercount. "Watched order" always
              means <span className={code}>added_at</span>.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
