import { useMemo, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ChevronDown, Info } from 'lucide-react';
import CountUp from './CountUp';
import { OrderToggle, ViewSwitcher, type ViewId } from './Controls';
import GhostPosterWall from './GhostPosterWall';
import GenreRadar from './GenreRadar';
import type { Entry, GenreCount, LibraryStats, Order } from '../data/library';

interface Props {
  order: Order;
  view: ViewId;
  onOrder: (o: Order) => void;
  onSwitch: (v: ViewId) => void;
  entries: Entry[];
  stats: LibraryStats;
  genres: GenreCount[];
}

const rise = {
  hidden: { opacity: 0, y: 34 },
  show: (d: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: d, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function Hero({ order, view, onOrder, onSwitch, entries, stats, genres }: Props) {
  const years = `${stats.from.getUTCFullYear()} ————— ${stats.to.getUTCFullYear()}`;

  /* pointer parallax for the right-hand layers */
  const rightRef = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 18 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18 });
  const radarRawX = useMotionValue(0);
  const radarRawY = useMotionValue(0);
  const radarX = useSpring(radarRawX, { stiffness: 60, damping: 18 });
  const radarY = useSpring(radarRawY, { stiffness: 60, damping: 18 });

  const onMove = (e: React.MouseEvent) => {
    const r = rightRef.current?.getBoundingClientRect();
    if (!r) return;
    const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    rawX.set(nx);
    rawY.set(ny);
    radarRawX.set(nx * 7);
    radarRawY.set(ny * 5);
  };

  const topGenre = useMemo(() => genres[0], [genres]);

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden border-b border-line bg-ink">
      {/* letterbox bar */}
      <div className="relative z-20 flex items-center justify-between border-b border-line/60 bg-black px-4 py-2.5 font-tele text-[10px] tracking-[0.28em] text-dim sm:px-8">
        <span className="text-fog">A PERSONAL SCREENING HISTORY</span>
        <span className="hidden sm:block">{years}</span>
        <span className="flex items-center gap-2">
          <span className="rec-dot inline-block h-1.5 w-1.5 rounded-full bg-blood" />
          LOG_001
        </span>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1680px] flex-1 grid-cols-1 lg:grid-cols-[1.04fr_0.96fr]">
        {/* ── LEFT — the number, the math, the controls ── */}
        <div className="relative flex flex-col justify-center px-4 pb-16 pt-14 sm:px-8 lg:px-12 lg:pb-24 lg:pt-20">
          <motion.div
            variants={rise}
            initial="hidden"
            animate="show"
            custom={0.05}
            className="flex items-center gap-3 font-tele text-[10px] tracking-[0.42em] text-fog sm:text-[11px]"
          >
            <span className="slab-line w-10" />
            WHICH IS, CONSERVATIVELY,
          </motion.div>

          <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-2">
            <motion.h1
              variants={rise}
              initial="hidden"
              animate="show"
              custom={0.15}
              className="flex items-baseline gap-5 font-display leading-[0.82]"
            >
              <CountUp
                value={stats.days}
                duration={2.9}
                delay={0.35}
                className="text-[clamp(96px,15vw,260px)] text-bone [text-shadow:0_0_60px_rgba(229,9,20,0.22)]"
              />
              <span className="pb-[0.06em] text-[clamp(30px,4.4vw,76px)] uppercase text-blood">
                Days
              </span>
            </motion.h1>
            <motion.div
              variants={rise}
              initial="hidden"
              animate="show"
              custom={0.3}
              className="mb-2 flex items-center gap-4 font-display text-[clamp(26px,3.6vw,56px)]"
            >
              <span className="flex items-baseline gap-2">
                <CountUp value={stats.hours} duration={3.1} delay={0.5} pad={2} className="text-outline" />
                <span className="font-tele text-[11px] tracking-[0.3em] text-blood">HRS</span>
              </span>
              <span className="h-[0.9em] w-px bg-line" />
              <span className="flex items-baseline gap-2">
                <CountUp value={stats.minutesRemainder} duration={3.3} delay={0.55} pad={2} className="text-outline" />
                <span className="font-tele text-[11px] tracking-[0.3em] text-blood">MIN</span>
              </span>
            </motion.div>
          </div>

          <motion.p
            variants={rise}
            initial="hidden"
            animate="show"
            custom={0.42}
            className="mt-6 max-w-xl text-sm leading-relaxed text-fog sm:text-base"
          >
            Every film and series I sat through — <span className="text-bone">{stats.movies} films</span>,{' '}
            <span className="text-bone">{stats.shows} series</span>,{' '}
            <span className="text-bone">{stats.entries} titles</span> — laid end to end in one
            continuous runtime.
            {topGenre && (
              <>
                {' '}
                The dial on the right reads the library back by genre —{' '}
                <span className="text-bone">{topGenre.name}</span> leads with{' '}
                <span className="text-blood">{topGenre.count}</span> titles.
              </>
            )}
          </motion.p>

          <motion.div
            variants={rise}
            initial="hidden"
            animate="show"
            custom={0.5}
            className="mt-3 flex max-w-xl items-start gap-2 font-tele text-[9.5px] leading-relaxed tracking-[0.08em] text-dim"
          >
            <Info size={12} className="mt-px shrink-0" />
            <span>
              APPROXIMATION: SERIES TIME = EPISODES × AVERAGE EPISODE LENGTH; ONGOING SHOWS
              UNDERCOUNT UNTIL ALL EPISODES ARE REFLECTED.
            </span>
          </motion.div>

          <motion.div
            variants={rise}
            initial="hidden"
            animate="show"
            custom={0.62}
            className="mt-12 grid max-w-3xl gap-8 md:grid-cols-[auto_1fr] md:items-end"
          >
            <OrderToggle order={order} onChange={onOrder} />
            <ViewSwitcher view={view} onSwitch={onSwitch} />
          </motion.div>
        </div>

        {/* ── RIGHT — ghost poster wall behind, genre radar in front ── */}
        <div
          ref={rightRef}
          onMouseMove={onMove}
          onMouseLeave={() => {
            rawX.set(0);
            rawY.set(0);
            radarRawX.set(0);
            radarRawY.set(0);
          }}
          className="relative min-h-[600px] lg:min-h-0"
        >
          <GhostPosterWall entries={entries} mx={mx} my={my} />
          <div className="relative z-10 flex h-full items-center justify-center p-5 sm:p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              style={{ x: radarX, y: radarY }}
              className="w-full max-w-[560px]"
            >
              <GenreRadar genres={genres} totalTitles={stats.entries} totalGenres={stats.genres} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* scroll cue */}
      <motion.div
        className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
      >
        <div className="flex flex-col items-center gap-1.5 font-tele text-[9px] tracking-[0.34em] text-dim">
          <span>SCROLL — START AT FRAME 00001</span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown size={14} className="text-blood" />
          </motion.span>
        </div>
      </motion.div>
    </section>
  );
}
