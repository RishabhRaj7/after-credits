import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useInView, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowDown, ArrowUp, Film, Heart, Tv } from 'lucide-react';
import { posterSrc } from '../components/Poster';
import {
  decadeStats,
  fmtDur,
  groupByYear,
  watchMinutes,
  type DecadeStat,
  type Entry,
  type Order,
  type TypeFilter,
  type YearGroup,
} from '../data/library';

/* ── odometer digit — one full glyph visible, rolls into place ─────────── */
function ODigit({ value, delay }: { value: number; delay: number }) {
  return (
    <span className="block overflow-hidden" style={{ height: '1em' }}>
      <motion.span
        className="block"
        style={{ lineHeight: 1 }}
        initial={{ y: '0em' }}
        whileInView={{ y: `${-value}em` }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ type: 'spring', stiffness: 90, damping: 17, delay }}
      >
        {Array.from({ length: 10 }, (_, d) => (
          <span key={d} className="block" style={{ height: '1em', lineHeight: 1 }}>
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function YearPlate({ year, titles, hours }: { year: number; titles: number; hours: number }) {
  const digits = String(year).split('').map(Number);
  return (
    <div className="year-plate relative z-20 flex flex-col items-center">
      <div className="border border-blood/70 bg-ink px-7 pb-3 pt-5 shadow-[0_0_50px_rgba(229,9,20,0.14)]">
        {/* BUG FIX: each digit window is exactly 1em tall with line-height 1,
            so the full year is always visible — never clipped mid-glyph */}
        <div
          className="flex flex-col items-center font-display text-bone"
          style={{ fontSize: 'clamp(58px, 8vw, 92px)' }}
        >
          {digits.map((d, i) => (
            <ODigit key={`${year}-${i}`} value={d} delay={i * 0.09} />
          ))}
        </div>
        <div className="mt-1.5 text-center font-tele text-[9px] tracking-[0.34em] text-blood">
          ● REEL
        </div>
      </div>
      <div className="mt-2.5 font-tele text-[10px] tracking-[0.26em] text-dim">
        {titles} TITLES · {hours}H
      </div>
    </div>
  );
}

/* ── one title block ───────────────────────────────────────────────────── */

/* deterministic wine/maroon palettes for typographic reel cards */
const CARD_SEEDS: Array<[string, string]> = [
  ['#6d222c', '#170a0e'],
  ['#7a2733', '#150a10'],
  ['#5c1c2e', '#130a12'],
  ['#802a2a', '#1a0c0c'],
  ['#63203a', '#150a11'],
  ['#712238', '#180b0d'],
];

function cardHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const MO = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function fmtLogged(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${MO[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')} · ${d.getFullYear()}`;
}

/* small poster card: FILM · year on top, title low, runtime + number on the bottom edge */
function ReelPosterCard({ entry, num }: { entry: Entry; num: string }) {
  const [broken, setBroken] = useState(false);
  const showImg = !!entry.poster && !broken;
  const [c0, c1] = CARD_SEEDS[cardHash(entry.title) % CARD_SEEDS.length];
  const unit = entry.type === 'movie' ? (entry.runtimeMinutes ?? 0) : (entry.episodeRuntime ?? 0);
  return (
    <div
      className="relative h-full w-full overflow-hidden ring-1 ring-white/15"
      style={{ background: `linear-gradient(152deg, ${c0} 0%, ${c1} 82%)` }}
    >
      {showImg && (
        <img
          src={posterSrc(entry.poster!)}
          alt={entry.title}
          loading="lazy"
          draggable={false}
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {showImg && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/75 to-transparent" />
        </>
      )}
      <div className="absolute inset-0 flex flex-col justify-between p-2 sm:p-2.5">
        <div className="flex items-center justify-between font-tele text-[7.5px] tracking-[0.16em] text-bone/85">
          <span className="flex items-center gap-1">
            {entry.type === 'movie' ? <Film size={9} /> : <Tv size={9} />}
            {entry.type === 'movie' ? 'FILM' : 'SERIES'}
          </span>
          <span>{entry.year ?? '————'}</span>
        </div>
        {!showImg && (
          <div className="line-clamp-3 font-display text-[17px] uppercase leading-[0.88] tracking-wide text-bone sm:text-[19px]">
            {entry.title}
          </div>
        )}
        <div className="flex items-center justify-between font-tele text-[7.5px] uppercase tracking-[0.14em] text-bone/70">
          <span>{unit ? fmtDur(unit) : '—'}</span>
          <span>{num}</span>
        </div>
      </div>
      {entry.favorite && (
        <div className="absolute right-1.5 top-5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60">
          <Heart size={8} className="fill-blood text-blood" />
        </div>
      )}
    </div>
  );
}

function ReelBlock({
  entry,
  index,
  side,
  first,
  onSelect,
}: {
  entry: Entry;
  index: number;
  side: 'l' | 'r';
  first: boolean;
  onSelect: (e: Entry) => void;
}) {
  const total = watchMinutes(entry);
  const unit = entry.type === 'movie' ? (entry.runtimeMinutes ?? 0) : (entry.episodeRuntime ?? 0);
  const num = `#${String(index + 1).padStart(3, '0')}`;

  return (
    <motion.div
      className={`reel-block group relative ${first ? 'mt-12' : 'mt-2'}`}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* dashed rule reaching outward from the spine */}
      <div
        className={`pointer-events-none absolute top-1/2 hidden h-px border-t border-dashed border-white/10 md:block ${
          side === 'l' ? 'left-0 right-1/2 mr-9' : 'left-1/2 right-0 ml-9'
        }`}
      />
      {/* dashed tick bridging the row to the spine */}
      <span
        className={`absolute top-1/2 hidden w-7 border-t border-dashed border-blood/50 md:block ${
          side === 'l' ? 'right-1/2' : 'left-1/2'
        }`}
      />
      <span className="reel-tick absolute left-1/2 top-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blood shadow-[0_0_8px_rgba(229,9,20,0.85)]" />

      <div
        className={`relative ${
          side === 'l' ? 'md:mr-auto md:w-[calc(50%-26px)]' : 'md:ml-auto md:w-[calc(50%-26px)]'
        }`}
      >
        {/* hover panel + red edge on the spine-facing side */}
        <div className="pointer-events-none absolute inset-0 bg-white/[0.035] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span
          className={`pointer-events-none absolute bottom-0 top-0 w-[3px] origin-top scale-y-0 bg-blood shadow-[0_0_12px_rgba(229,9,20,0.75)] transition-transform duration-300 group-hover:scale-y-100 ${
            side === 'l' ? 'right-0' : 'left-0'
          }`}
        />

        <div
          className={`relative flex items-center gap-4 px-3 py-2.5 sm:gap-5 sm:px-4 ${
            side === 'l' ? 'md:flex-row-reverse' : ''
          }`}
        >
          <motion.button
            type="button"
            onClick={() => onSelect(entry)}
            aria-label={`View ${entry.title}`}
            whileHover={{ scale: 1.95, zIndex: 60 }}
            whileTap={{ scale: 1.86 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="reel-poster relative block aspect-[2/3] w-[74px] shrink-0 cursor-pointer outline-none sm:w-[88px]"
            style={{ zIndex: 2 }}
          >
            <ReelPosterCard entry={entry} num={num} />
          </motion.button>

          <div className={`min-w-0 ${side === 'l' ? 'md:text-right' : ''}`}>
            <div
              className={`flex items-center gap-2 font-tele text-[9px] tracking-[0.2em] ${
                side === 'l' ? 'md:justify-end' : ''
              }`}
            >
              <span className="flex items-center gap-1 font-medium text-blood">
                {entry.type === 'movie' ? <Film size={9} /> : <Tv size={9} />}
                {entry.type === 'movie' ? 'FILM' : 'SERIES'}
              </span>
              <span className="text-line">/</span>
              <span className="text-dim">{entry.year ?? '————'}</span>
            </div>
            <h3 className="mt-1 truncate text-lg font-bold tracking-tight text-bone sm:text-[22px]">
              {entry.title}
            </h3>
            <div className="mt-1 font-tele text-[9px] tracking-[0.16em] text-dim">
              LOGGED {fmtLogged(entry.addedAt)}
            </div>
            <div className="mt-1 font-tele text-[9px] uppercase tracking-[0.16em] text-dim">
              {entry.type === 'movie' ? (
                total ? fmtDur(total) : '—'
              ) : (
                <>
                  {unit ? fmtDur(unit) : '—'} <span className="text-line">·</span> ≈
                  {total ? fmtDur(total) : '—'}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── one year on the reel ──────────────────────────────────────────────── */
function YearSection({
  group,
  startIndex,
  maxCount,
  onInView,
  onSelect,
}: {
  group: YearGroup;
  startIndex: number;
  maxCount: number;
  onInView: (y: number) => void;
  onSelect: (e: Entry) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const active = useInView(ref, { margin: '-40% 0px -50% 0px' });
  useEffect(() => {
    if (active) onInView(group.year);
  }, [active, group.year, onInView]);

  const density = group.items.length / maxCount;
  const spineW = Math.round(4 + density * 18);

  return (
    <section id={`y${group.year}`} ref={ref} className="reel-year relative">
      {/* spine segment — thickness + glow carry density */}
      <div
        className={`reel-spine absolute bottom-0 left-1/2 top-0 -translate-x-1/2 ${density > 0.45 ? 'spine-hot' : ''}`}
        style={{
          width: spineW,
          borderRadius: spineW / 2,
          background: active
            ? `linear-gradient(180deg, rgba(229,9,20,${0.4 + density * 0.5}), rgba(120,6,12,${0.45 + density * 0.45}))`
            : 'linear-gradient(180deg, rgba(229,9,20,0.18), rgba(80,8,12,0.24))',
          boxShadow: active
            ? `0 0 ${Math.round(10 + density * 22)}px rgba(229,9,20,${0.2 + density * 0.4})`
            : '0 0 8px rgba(229,9,20,0.06)',
          transition: 'width .5s ease, box-shadow .6s ease, background .6s ease',
        }}
      />
      <div className="relative z-10 flex justify-center pt-6">
        <YearPlate year={group.year} titles={group.items.length} hours={Math.round(group.minutes / 60)} />
      </div>
      <div className="relative z-10 pb-20 pt-4">
        {group.items.map((e, i) => (
          <ReelBlock
            key={e.id}
            entry={e}
            index={startIndex + i}
            side={i % 2 === 0 ? 'l' : 'r'}
            first={i === 0}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

/* ── decade intermission ───────────────────────────────────────────────── */
function SprocketRail({ side }: { side: 'l' | 'r' }) {
  return (
    <div className={`absolute inset-y-6 flex flex-col justify-between ${side === 'l' ? 'left-4 sm:left-8' : 'right-4 sm:right-8'}`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-3 w-4 rounded-[2px] border border-line bg-ink/60" />
      ))}
    </div>
  );
}

function Intermission({ stat }: { stat: DecadeStat }) {
  return (
    <div className="reel-intermission relative my-10 overflow-hidden border-y border-line bg-coal/70 py-16 text-center">
      <SprocketRail side="l" />
      <SprocketRail side="r" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-20% 0px' }}
        transition={{ duration: 0.7 }}
      >
        <div className="font-tele text-[10px] tracking-[0.4em] text-dim">— INTERMISSION —</div>
        <div className="mt-3 font-display text-6xl tracking-wide text-bone sm:text-7xl">
          The {stat.decade}s
        </div>
        <div className="mt-3 font-tele text-[11px] tracking-[0.24em] text-fog">
          {stat.titles} TITLES · {Math.round(stat.minutes / 60).toLocaleString()} HOURS
        </div>
        <div className="mt-4 font-tele text-[9px] tracking-[0.3em] text-blood/80">
          THE PROJECTIONIST CHANGES THE REEL
        </div>
      </motion.div>
    </div>
  );
}

/* ── sticky filter chips ───────────────────────────────────────────────── */
export function ChipsBar({
  groups,
  decades,
  hidden,
  onToggleYear,
  onToggleDecade,
  onAll,
  typeFilter,
  onTypeFilter,
  label = 'REEL FILTER',
  hint = 'REEL SHORTENS LIVE',
}: {
  groups: YearGroup[];
  decades: DecadeStat[];
  hidden: Set<number>;
  onToggleYear: (y: number) => void;
  onToggleDecade: (d: number) => void;
  onAll: () => void;
  typeFilter: TypeFilter;
  onTypeFilter: (t: TypeFilter) => void;
  label?: string;
  hint?: string;
}) {
  const visible = groups.reduce((s, g) => s + (hidden.has(g.year) ? 0 : g.items.length), 0);
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  const chip = 'rounded-full border px-2.5 py-1 font-tele text-[9.5px] tracking-[0.14em] transition-all duration-200 cursor-pointer';
  return (
    <div className="timeline-filters sticky top-12 z-40 border-b border-line bg-ink/95 backdrop-blur-md">
      <div className="timeline-filter-scroll mx-auto flex max-w-6xl flex-wrap items-center gap-1.5 px-5 py-2.5">
        <span className="mr-2 font-tele text-[9px] tracking-[0.3em] text-blood">{label}</span>

        {/* films / series / both */}
        <div className="mr-1 flex overflow-hidden rounded-full border border-line">
          {(
            [
              ['all', 'ALL', null],
              ['movie', 'FILMS', Film],
              ['show', 'SERIES', Tv],
            ] as Array<[TypeFilter, string, typeof Film | null]>
          ).map(([id, lbl, Icon]) => (
            <button
              key={id}
              onClick={() => onTypeFilter(id)}
              aria-pressed={typeFilter === id}
              className={`flex cursor-pointer items-center gap-1 px-2.5 py-1 font-tele text-[9px] tracking-[0.16em] transition-colors duration-200 ${
                id !== 'all' ? 'border-l border-line' : ''
              } ${typeFilter === id ? 'bg-blood/15 text-bone' : 'text-dim hover:text-fog'}`}
            >
              {Icon && <Icon size={9} className={typeFilter === id ? 'text-blood' : ''} />}
              {lbl}
            </button>
          ))}
        </div>
        <span className="mx-1 h-4 w-px bg-line" />

        {decades.map((d) => {
          const allIn = d.years.every((y) => !hidden.has(y));
          return (
            <button
              key={d.decade}
              onClick={() => onToggleDecade(d.decade)}
              aria-pressed={allIn}
              className={`${chip} ${allIn ? 'border-blood/70 bg-blood/15 text-bone' : 'border-line text-dim hover:border-fog/60 hover:text-fog'}`}
            >
              {d.decade}s
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px bg-line" />
        {groups.map((g) => {
          const off = hidden.has(g.year);
          return (
            <button
              key={g.year}
              onClick={() => onToggleYear(g.year)}
              aria-pressed={!off}
              title={`${g.items.length} titles`}
              className={`${chip} ${off ? 'border-line text-dim line-through opacity-50' : 'border-fog/40 text-bone hover:border-blood/70'}`}
            >
              {g.year} <span className={off ? 'text-dim' : 'text-blood'}>{g.items.length}</span>
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px bg-line" />
        <button onClick={onAll} className={`${chip} border-line text-fog hover:border-blood/70 hover:text-bone`}>ALL</button>
        <span className="ml-auto hidden font-tele text-[9px] tracking-[0.2em] text-dim sm:inline">
          SHOWING {visible}/{total} · {hint}
        </span>
      </div>
    </div>
  );
}

/* ── seek-bar scrubber rail ────────────────────────────────────────────── */
function ScrubberRail({
  groups,
  hidden,
  activeYear,
  container,
}: {
  groups: YearGroup[];
  hidden: Set<number>;
  activeYear: number | null;
  container: React.RefObject<HTMLDivElement | null>;
}) {
  const { scrollYProgress } = useScroll({ target: container, offset: ['start 0.5', 'end 0.6'] });
  const thumbTop = useScrollTop(scrollYProgress);
  const max = Math.max(...groups.map((g) => g.items.length), 1);
  /* place dots by cumulative content weight so the rail mirrors the page:
     heavy years stretch their gap, light years sit close together, and the
     scroll thumb lands on the dot of the year actually on screen */
  const BASE = 3; // plate + breathing room per year, in title units
  const totalW = groups.reduce((s, g) => s + g.items.length + BASE, 0) || 1;
  const fracs: number[] = [];
  {
    let acc = 0;
    for (const g of groups) {
      const w = g.items.length + BASE;
      fracs.push((acc + w / 2) / totalW);
      acc += w;
    }
  }
  const jump = (y: number) => {
    if (hidden.has(y)) return;
    document.getElementById(`y${y}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* only surface the rail while the reel section actually occupies the viewport */
  const [inReel, setInReel] = useState(false);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInReel(entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [container]);

  /* positional sync: the last year section whose top crossed the 45% line wins.
     direct measurement never skips a year, whatever the scroll speed */
  const [activeYearNow, setActiveYearNow] = useState<number | null>(activeYear);
  useEffect(() => {
    if (!inReel) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      /* a year owns the rail dot while its section spans the vertical centre
         of the viewport — the point you're actually reading at */
      const line = window.innerHeight * 0.5;
      let current: number | null = null;
      for (const g of groups) {
        const el = document.getElementById(`y${g.year}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = g.year;
        else break;
      }
      /* end clamp: a short final year may never push its top past centre
         before the page runs out — keep it lit once we've scrolled through it */
      const last = groups[groups.length - 1];
      if (last) {
        const el = document.getElementById(`y${last.year}`);
        if (el && el.getBoundingClientRect().bottom <= line) current = last.year;
      }
      setActiveYearNow((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [inReel, groups]);

  if (groups.length === 0) return null;
  /* portal to <body>: an ancestor motion.main carries filter: blur(0px), which
     would hijack position:fixed and pin the rail to the page's middle instead
     of the viewport */
  return createPortal(
    <AnimatePresence>
      {inReel && (
        <motion.div
          key="seek-rail"
          initial={{ opacity: 0, x: 26, y: '-50%' }}
          animate={{ opacity: 1, x: 0, y: '-50%' }}
          exit={{ opacity: 0, x: 26, y: '-50%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed right-2 top-1/2 z-40 flex h-[54vh] max-h-[540px] flex-col items-center md:right-5"
        >
      <span className="mb-3 font-tele text-[8px] tracking-[0.42em] text-dim">SEEK</span>
      <div className="relative flex-1 md:w-16">
        {/* spine */}
        <div className="absolute inset-y-0 left-[7px] w-px bg-gradient-to-b from-blood/50 via-line to-blood/40 md:left-[9px]" />
        {/* scroll-progress thumb — the little red square */}
        <motion.div
          className="absolute left-[7px] h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 bg-blood shadow-[0_0_10px_rgba(229,9,20,0.85)] md:left-[9px]"
          style={{ top: thumbTop }}
        />
        {groups.map((g, i) => {
          const frac = fracs[i];
          const size = 5 + (g.items.length / max) * 5;
          const off = hidden.has(g.year);
          const active = activeYearNow === g.year;
          const dot = active ? size + 4 : size;
          return (
            <button
              key={g.year}
              onClick={() => jump(g.year)}
              title={`${g.year} — ${g.items.length} titles`}
              aria-label={`Jump to ${g.year}`}
              className="group absolute left-0 flex -translate-y-1/2 cursor-pointer items-center gap-3"
              style={{ top: `${frac * 100}%` }}
            >
              <span className="grid w-[15px] shrink-0 place-items-center md:w-[19px]">
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    off
                      ? 'bg-line'
                      : active
                        ? 'bg-ember shadow-[0_0_12px_rgba(255,43,56,0.95)]'
                        : 'bg-dim group-hover:bg-blood'
                  }`}
                  style={{ width: dot, height: dot }}
                />
              </span>
              <span
                className={`hidden whitespace-nowrap font-tele text-[10px] tracking-[0.22em] transition-colors duration-200 md:block ${
                  active ? 'text-bone' : off ? 'text-dim/60' : 'text-dim group-hover:text-fog'
                }`}
              >
                {g.year}
              </span>
            </button>
          );
        })}
      </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* tiny helper: map a MotionValue 0..1 to a % string for the rail thumb */
function useScrollTop(v: MotionValue<number>) {
  return useTransform(v, (x) => `${x * 100}%`);
}

/* ── the view ──────────────────────────────────────────────────────────── */
export default function Reel({
  items,
  order,
  onSelect,
  hidden,
  onHidden,
  dir,
  onDir,
  typeFilter,
  onTypeFilter,
}: {
  items: Entry[];
  order: Order;
  onSelect: (e: Entry) => void;
  hidden: Set<number>;
  onHidden: (fn: (prev: Set<number>) => Set<number>) => void;
  dir: 'asc' | 'desc';
  onDir: (d: 'asc' | 'desc') => void;
  typeFilter: TypeFilter;
  onTypeFilter: (t: TypeFilter) => void;
}) {
  const groups = useMemo(() => groupByYear(items, order), [items, order]);
  const decades = useMemo(() => decadeStats(groups), [groups]);
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onInView = useCallback((y: number) => setActiveYear(y), []);
  const maxCount = useMemo(() => Math.max(...groups.map((g) => g.items.length), 1), [groups]);

  const toggleYear = useCallback(
    (y: number) => {
      onHidden((h) => {
        const n = new Set(h);
        if (n.has(y)) n.delete(y);
        else n.add(y);
        return n;
      });
    },
    [onHidden],
  );

  const toggleDecade = useCallback(
    (d: number) => {
      onHidden((h) => {
        const n = new Set(h);
        const ys = groups.filter((g) => Math.floor(g.year / 10) * 10 === d).map((g) => g.year);
        const allIn = ys.every((y) => !n.has(y));
        ys.forEach((y) => (allIn ? n.add(y) : n.delete(y)));
        return n;
      });
    },
    [groups, onHidden],
  );

  /* chronological direction: groups always thread ascending underneath so the
     #NNN numbering stays stable when the reel is flipped to newest-first */
  const visibleAsc = useMemo(() => groups.filter((g) => !hidden.has(g.year)), [groups, hidden]);
  const visible = useMemo(
    () => (dir === 'asc' ? visibleAsc : [...visibleAsc].reverse()),
    [visibleAsc, dir],
  );
  const startIndices = useMemo(() => {
    const m = new Map<number, number>();
    let acc = 0;
    for (const g of visibleAsc) {
      m.set(g.year, acc);
      acc += g.items.length;
    }
    return m;
  }, [visibleAsc]);

  return (
    <div ref={containerRef} className="relative">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-5 pb-8 pt-16">
        <div className="chrome-orig">
          <div className="font-tele text-[10px] font-medium tracking-[0.42em] text-blood">VIEW 02</div>
          <h2 className="mt-2 font-display text-6xl uppercase leading-none tracking-wide text-bone sm:text-7xl">
            The <span className="text-outline-blood">Reel</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-fog">
            Every title in line, year by year. The spine thickens where your attention did.
            Kill a year in the filter and the reel physically shortens.
          </p>
        </div>

        {/* chronological direction */}
        <div className="chrome-orig flex items-center gap-2.5 pb-1">
          <span className="font-tele text-[9px] tracking-[0.3em] text-dim">CHRONO</span>
          <div className="flex overflow-hidden rounded-full border border-line">
            <button
              type="button"
              onClick={() => onDir('asc')}
              className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 font-tele text-[9px] tracking-[0.18em] transition-colors duration-200 ${
                dir === 'asc' ? 'bg-blood/15 text-bone' : 'text-dim hover:text-fog'
              }`}
            >
              <ArrowUp size={10} className={dir === 'asc' ? 'text-blood' : ''} /> OLDEST
            </button>
            <button
              type="button"
              onClick={() => onDir('desc')}
              className={`flex cursor-pointer items-center gap-1.5 border-l border-line px-3 py-1.5 font-tele text-[9px] tracking-[0.18em] transition-colors duration-200 ${
                dir === 'desc' ? 'bg-blood/15 text-bone' : 'text-dim hover:text-fog'
              }`}
            >
              <ArrowDown size={10} className={dir === 'desc' ? 'text-blood' : ''} /> NEWEST
            </button>
          </div>
        </div>
      </div>

      <ChipsBar
        groups={groups}
        decades={decades}
        hidden={hidden}
        onToggleYear={toggleYear}
        onToggleDecade={toggleDecade}
        onAll={() => onHidden(() => new Set())}
        typeFilter={typeFilter}
        onTypeFilter={onTypeFilter}
      />

      <ScrubberRail groups={visible} hidden={hidden} activeYear={activeYear} container={containerRef} />

      <div className="relative mx-auto max-w-6xl px-5 pb-10">
        <AnimatePresence initial={false}>
          {visible.map((g, vi) => {
            const prev = visible[vi - 1];
            const decadeChanged = !prev || Math.floor(prev.year / 10) !== Math.floor(g.year / 10);
            const stat = decades.find((d) => d.decade === Math.floor(g.year / 10) * 10)!;
            return (
              <Fragment key={g.year}>
                {decadeChanged && <Intermission stat={stat} />}
                <YearSection
                  group={g}
                  startIndex={startIndices.get(g.year) ?? 0}
                  maxCount={maxCount}
                  onInView={onInView}
                  onSelect={onSelect}
                />
              </Fragment>
            );
          })}
        </AnimatePresence>

        {visible.length === 0 && (
          <div className="py-32 text-center">
            <div className="font-display text-5xl text-dim">Reel empty</div>
            <div className="mt-3 font-tele text-[10px] tracking-[0.24em] text-dim">
              EVERY YEAR IS FILTERED OUT — HIT ALL TO THREAD THE PROJECTOR
            </div>
          </div>
        )}

        <div className="pt-10 text-center">
          <div className="font-display text-5xl tracking-[0.2em] text-dim">FIN</div>
          <div className="mt-2 font-tele text-[9px] tracking-[0.3em] text-dim">
            {visible.reduce((s, g) => s + g.items.length, 0)} TITLES SHOWN · TO BE CONTINUED
          </div>
        </div>
      </div>
    </div>
  );
}
