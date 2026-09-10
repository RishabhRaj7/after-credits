import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Info } from 'lucide-react';
import CountUp from './CountUp';
import { PosterArt } from './Poster';
import { OrderToggle, ViewSwitcher, type ViewId } from './Controls';
import type { Entry, LibraryStats, Order } from '../data/library';

interface Props {
  order: Order;
  view: ViewId;
  onOrder: (o: Order) => void;
  onSwitch: (v: ViewId) => void;
  entries: Entry[];
  stats: LibraryStats;
}

function WallRow({ items, reverse = false }: { items: Entry[]; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div
      className="pointer-events-none flex w-max gap-2 opacity-[0.17] saturate-[0.6]"
      style={{
        animation: `${reverse ? 'wall-drift-r' : 'wall-drift-l'} 240s linear infinite`,
        maskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)',
      }}
    >
      {doubled.map((e, i) => (
        <div key={`${e.id}-${i}`} className="aspect-[2/3] w-[74px] shrink-0 overflow-hidden rounded-[2px] border border-white/5">
          <PosterArt entry={e} />
        </div>
      ))}
    </div>
  );
}

const rise = {
  hidden: { opacity: 0, y: 34 },
  show: (d: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.9, delay: d, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function Hero({ order, view, onOrder, onSwitch, entries, stats }: Props) {
  /* a sparse, evenly-spaced slice of the active library for the drifting
     wall (cycles when the library is smaller than 34 so both walls stay full) */
  const wall = useMemo(() => {
    if (!entries.length) return [] as Entry[];
    const stride = Math.max(1, Math.floor(entries.length / 34));
    const picks: Entry[] = [];
    for (let i = 0; picks.length < 34; i += stride) picks.push(entries[i % entries.length]);
    return picks;
  }, [entries]);
  const years = `${stats.from.getUTCFullYear()} ————— ${stats.to.getUTCFullYear()}`;
  return (
    <section className="screening-hero chrome-orig relative flex min-h-[100svh] flex-col overflow-hidden border-b border-line bg-ink">
      {/* letterbox bar */}
      <div className="hero-letterbox relative z-20 flex items-center justify-between border-b border-line/60 bg-black px-4 py-2.5 font-tele text-[10px] tracking-[0.28em] text-dim sm:px-8">
        <span className="text-fog">A PERSONAL SCREENING HISTORY</span>
        <span className="hidden sm:block">{years}</span>
        <span className="flex items-center gap-2">
          <span className="rec-dot inline-block h-1.5 w-1.5 rounded-full bg-blood" />
          LOG_001
        </span>
      </div>

      {/* drifting title-card walls, top + bottom */}
      <div className="absolute inset-x-0 top-[104px] z-0 overflow-hidden"><WallRow items={wall.slice(0, 17)} /></div>
      <div className="absolute inset-x-0 bottom-[26px] z-0 overflow-hidden"><WallRow items={wall.slice(17)} reverse /></div>

      {/* readability veil */}
      <div className="absolute inset-0 z-10" style={{
        background: 'radial-gradient(ellipse 86% 62% at 50% 47%, rgba(10,10,11,0.94) 30%, rgba(10,10,11,0.72) 68%, rgba(10,10,11,0.35) 100%)',
      }} />

      <div className="hero-content relative z-20 mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center px-4 pb-40 pt-28 sm:px-8">
        <motion.div variants={rise} initial="hidden" animate="show" custom={0.05}
          className="flex items-center gap-3 font-tele text-[10px] tracking-[0.42em] text-fog sm:text-[11px]">
          <span className="slab-line w-10" />
          WHICH IS, CONSERVATIVELY,
        </motion.div>

        {/* ── THE NUMBER ── */}
        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-2">
          <motion.h1
            variants={rise} initial="hidden" animate="show" custom={0.15}
            className="hero-total flex items-baseline gap-5 font-display leading-[0.82]"
          >
            <CountUp
              value={stats.days}
              duration={2.9}
              delay={0.35}
              className="text-[clamp(120px,23vw,340px)] text-bone [text-shadow:0_0_60px_rgba(229,9,20,0.22)]"
            />
            <span className="pb-[0.06em] text-[clamp(34px,6vw,92px)] uppercase text-blood">Days</span>
          </motion.h1>
          <motion.div
            variants={rise} initial="hidden" animate="show" custom={0.3}
            className="mb-2 flex items-center gap-4 font-display text-[clamp(28px,4.6vw,64px)]"
          >
            <span className="flex items-baseline gap-2">
              <CountUp value={stats.hours} duration={3.1} delay={0.5} pad={2} className="text-outline" />
              <span className="font-tele text-[11px] tracking-[0.3em] text-blood">HRS</span>
            </span>
            <span className="h-[0.9em] w-px bg-line" />
            <span className="flex items-baseline gap-2">
              <CountUp value={stats.minutes} duration={3.3} delay={0.55} pad={2} className="text-outline" />
              <span className="font-tele text-[11px] tracking-[0.3em] text-blood">MIN</span>
            </span>
          </motion.div>
        </div>

        <motion.p variants={rise} initial="hidden" animate="show" custom={0.42}
          className="mt-6 max-w-xl text-sm leading-relaxed text-fog sm:text-base">
          Every film and series I sat through —{' '}
          <span className="text-bone">{stats.movies} films</span>,{' '}
          <span className="text-bone">{stats.shows} series</span>,{' '}
          <span className="text-bone">{stats.entries} titles</span> — laid end to end
          in one continuous runtime.
        </motion.p>

        <motion.div variants={rise} initial="hidden" animate="show" custom={0.5}
          className="mt-3 flex max-w-xl items-start gap-2 font-tele text-[9.5px] leading-relaxed tracking-[0.08em] text-dim">
          <Info size={12} className="mt-px shrink-0" />
          <span>
            APPROXIMATION: SERIES TIME = EPISODES × AVERAGE EPISODE LENGTH; ONGOING SHOWS
            UNDERCOUNT UNTIL ALL EPISODES ARE REFLECTED.
          </span>
        </motion.div>

        {/* ── CONTROLS ── */}
        <motion.div variants={rise} initial="hidden" animate="show" custom={0.62}
          className="hero-controls mt-12 grid max-w-4xl gap-8 md:grid-cols-[auto_1fr] md:items-end">
          <OrderToggle order={order} onChange={onOrder} />
          <ViewSwitcher view={view} onSwitch={onSwitch} />
        </motion.div>
      </div>

      {/* scroll cue */}
      <motion.div
        className="hero-scroll-cue absolute bottom-[120px] left-1/2 z-20 -translate-x-1/2"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 1 }}
      >
        <div className="flex flex-col items-center gap-1.5 font-tele text-[9px] tracking-[0.34em] text-dim">
          <span>SCROLL — START AT FRAME 00001</span>
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
            <ChevronDown size={14} className="text-blood" />
          </motion.span>
        </div>
      </motion.div>
    </section>
  );
}
