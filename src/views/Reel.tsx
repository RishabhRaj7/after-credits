import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { Film, Tv, Heart } from 'lucide-react';
import { ZoomPoster } from '../components/Poster';
import {
  decadeStats,
  fmtDate,
  fmtDur,
  groupByYear,
  watchMinutes,
  type DecadeStat,
  type Entry,
  type Order,
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
    <div className="relative z-20 flex flex-col items-center">
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
function ReelBlock({
  entry,
  order,
  index,
  side,
  first,
  onSelect,
}: {
  entry: Entry;
  order: Order;
  index: number;
  side: 'l' | 'r';
  first: boolean;
  onSelect: (e: Entry) => void;
}) {
  const watch = order === 'watch';
  const date = watch ? entry.addedAt : (entry.releaseDate ?? entry.addedAt);
  const mins = watchMinutes(entry);

  const text = (align: 'left' | 'right') => (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <div className="flex items-center gap-2 font-tele text-[9px] tracking-[0.26em] text-dim" style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {entry.type === 'movie' ? <Film size={10} /> : <Tv size={10} />}
        {entry.type === 'movie' ? 'FILM' : 'SERIES'} <span className="text-line">/</span> {entry.year ?? '————'}
        {entry.favorite && <Heart size={9} className="fill-blood text-blood" />}
      </div>
      <div className="mt-1.5 text-[28px] font-semibold leading-tight tracking-tight text-bone sm:text-4xl">
        {entry.title}
      </div>
      <div className="mt-1 text-sm text-fog">{mins ? fmtDur(mins) : '—'}</div>
      <div className="mt-2 font-tele text-[9px] tracking-[0.2em] text-dim">
        {watch ? 'ADDED' : 'PREMIERE'} {fmtDate(date)}
      </div>
    </div>
  );

  return (
    <motion.div
      className={`relative ${first ? 'mt-14' : 'mt-12 md:-mt-12'}`}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* dashed rule reaching outward */}
      <div
        className={`pointer-events-none absolute top-1/2 hidden h-px border-t border-dashed border-white/10 md:block ${
          side === 'l' ? 'left-0 right-1/2 mr-14' : 'left-1/2 right-0 ml-14'
        }`}
      />
      {/* connector tick to the spine + dot */}
      <span className={`absolute top-1/2 hidden h-px w-8 bg-blood/50 md:block ${side === 'l' ? 'right-1/2' : 'left-1/2'}`} />
      <span className="absolute left-1/2 top-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blood shadow-[0_0_8px_rgba(229,9,20,0.85)]" />
      <span className={`absolute top-1/2 hidden -translate-y-1/2 font-tele text-[8px] tracking-[0.2em] text-dim/70 md:block ${side === 'l' ? 'right-1/2 mr-10' : 'left-1/2 ml-10'}`}>
        #{String(index + 1).padStart(3, '0')}
      </span>

      <div
        className={`relative flex items-center gap-4 sm:gap-6 ${
          side === 'l' ? 'md:w-1/2 md:justify-end md:pr-12' : 'md:ml-auto md:w-1/2 md:justify-start md:pl-12'
        }`}
      >
        <ZoomPoster
          entry={entry}
          onClick={onSelect}
          hoverScale={1.5}
          className={`aspect-[2/3] w-24 shrink-0 sm:w-28 ${side === 'l' ? 'md:order-2' : ''}`}
          posterClass="h-full w-full"
        />
        <div className={side === 'l' ? 'md:order-1' : ''}>{text(side === 'l' ? 'right' : 'left')}</div>
      </div>
    </motion.div>
  );
}

/* ── one year on the reel ──────────────────────────────────────────────── */
function YearSection({
  group,
  order,
  startIndex,
  maxCount,
  onInView,
  onSelect,
}: {
  group: YearGroup;
  order: Order;
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
    <section id={`y${group.year}`} ref={ref} className="relative">
      {/* spine segment — thickness + glow carry density */}
      <div
        className={`absolute bottom-0 left-1/2 top-0 -translate-x-1/2 ${density > 0.45 ? 'spine-hot' : ''}`}
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
            order={order}
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
    <div className="relative my-10 overflow-hidden border-y border-line bg-coal/70 py-16 text-center">
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
function ChipsBar({
  groups,
  decades,
  hidden,
  onToggleYear,
  onToggleDecade,
  onAll,
  onNone,
}: {
  groups: YearGroup[];
  decades: DecadeStat[];
  hidden: Set<number>;
  onToggleYear: (y: number) => void;
  onToggleDecade: (d: number) => void;
  onAll: () => void;
  onNone: () => void;
}) {
  const visible = groups.reduce((s, g) => s + (hidden.has(g.year) ? 0 : g.items.length), 0);
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  const chip = 'rounded-full border px-2.5 py-1 font-tele text-[9.5px] tracking-[0.14em] transition-all duration-200 cursor-pointer';
  return (
    <div className="sticky top-[49px] z-40 border-b border-line bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1.5 px-5 py-2.5">
        <span className="mr-2 font-tele text-[9px] tracking-[0.3em] text-blood">REEL FILTER</span>
        {decades.map((d) => {
          const allIn = d.years.every((y) => !hidden.has(y));
          return (
            <button
              key={d.decade}
              onClick={() => onToggleDecade(d.decade)}
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
              title={`${g.items.length} titles`}
              className={`${chip} ${off ? 'border-line text-dim line-through opacity-50' : 'border-fog/40 text-bone hover:border-blood/70'}`}
            >
              {g.year} <span className={off ? 'text-dim' : 'text-blood'}>{g.items.length}</span>
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px bg-line" />
        <button onClick={onAll} className={`${chip} border-line text-fog hover:border-blood/70 hover:text-bone`}>ALL</button>
        <button onClick={onNone} className={`${chip} border-line text-fog hover:border-blood/70 hover:text-bone`}>NONE</button>
        <span className="ml-auto hidden font-tele text-[9px] tracking-[0.2em] text-dim sm:inline">
          SHOWING {visible}/{total} · REEL SHORTENS LIVE
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
  const max = Math.max(...groups.map((g) => g.items.length), 1);
  const jump = (y: number) => {
    if (hidden.has(y)) return;
    document.getElementById(`y${y}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <div className="fixed right-4 top-1/2 z-40 hidden h-[58vh] w-6 -translate-y-1/2 lg:block">
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-blood/60 via-blood/25 to-blood/60" />
      <motion.div
        className="absolute left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember shadow-[0_0_10px_rgba(255,43,56,0.9)]"
        style={{ top: useScrollTop(scrollYProgress) }}
      />
      {groups.map((g, i) => {
        const frac = groups.length === 1 ? 0.5 : i / (groups.length - 1);
        const size = 5 + (g.items.length / max) * 8;
        const off = hidden.has(g.year);
        const active = activeYear === g.year;
        return (
          <button
            key={g.year}
            onClick={() => jump(g.year)}
            title={`${g.year} — ${g.items.length} titles`}
            className="group absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${frac * 100}%` }}
          >
            <span
              className={`block rounded-full transition-all ${
                off ? 'bg-line' : active ? 'bg-ember shadow-[0_0_10px_rgba(255,43,56,0.9)]' : 'bg-fog group-hover:bg-blood'
              }`}
              style={{ width: size, height: size }}
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 whitespace-nowrap font-tele text-[9px] tracking-[0.2em] text-fog opacity-0 transition-opacity group-hover:opacity-100">
              {g.year}
            </span>
          </button>
        );
      })}
    </div>
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
}: {
  items: Entry[];
  order: Order;
  onSelect: (e: Entry) => void;
}) {
  const groups = useMemo(() => groupByYear(items, order), [items, order]);
  const decades = useMemo(() => decadeStats(groups), [groups]);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setHidden(new Set()), [order]);
  const onInView = useCallback((y: number) => setActiveYear(y), []);
  const maxCount = useMemo(() => Math.max(...groups.map((g) => g.items.length), 1), [groups]);

  const toggleYear = useCallback((y: number) => {
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(y)) n.delete(y);
      else n.add(y);
      return n;
    });
  }, []);

  const toggleDecade = useCallback(
    (d: number) => {
      setHidden((h) => {
        const n = new Set(h);
        const ys = groups.filter((g) => Math.floor(g.year / 10) * 10 === d).map((g) => g.year);
        const allIn = ys.every((y) => !n.has(y));
        ys.forEach((y) => (allIn ? n.add(y) : n.delete(y)));
        return n;
      });
    },
    [groups],
  );

  const visible = groups.filter((g) => !hidden.has(g.year));
  const startIndices = useMemo(() => {
    const m = new Map<number, number>();
    let acc = 0;
    for (const g of visible) {
      m.set(g.year, acc);
      acc += g.items.length;
    }
    return m;
  }, [visible]);

  return (
    <div ref={containerRef} className="relative">
      <div className="mx-auto max-w-6xl px-5 pb-8 pt-16">
        <div className="font-tele text-[10px] tracking-[0.3em] text-blood">VIEW 02</div>
        <h2 className="mt-2 font-display text-6xl tracking-wide text-bone sm:text-7xl">The Reel</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-fog">
          Every title in line, year by year. The spine thickens where your attention did.
          Kill a year in the filter and the reel physically shortens.
        </p>
      </div>

      <ChipsBar
        groups={groups}
        decades={decades}
        hidden={hidden}
        onToggleYear={toggleYear}
        onToggleDecade={toggleDecade}
        onAll={() => setHidden(new Set())}
        onNone={() => setHidden(new Set(groups.map((g) => g.year)))}
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
                  order={order}
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
