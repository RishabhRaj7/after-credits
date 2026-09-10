import {
  Fragment, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  AnimatePresence, motion, useInView, useScroll,
} from 'framer-motion';
import { Film, Tv, Star } from 'lucide-react';
import { ZoomPoster } from '../components/Poster';
import {
  decadeStats, factLine, fmtDate, fmtDur, groupByYear,
  type DecadeStat, type Entry, type Order, type YearGroup,
} from '../data/library';

/**
 * VIEW 02 — THE REEL
 * A central spine whose thickness + glow track each year's density, an
 * odometer of stacked numerals that rolls into place when a new year enters,
 * alternating left/right title blocks, full-bleed decade intermissions,
 * sticky multi-select year filters that literally shorten the reel, and a
 * seek-bar scrubber rail on the edge of the screen.
 */

/* ── odometer digits ───────────────────────────────────────────────────── */

function ODigit({ value, active, delay }: { value: number; active: boolean; delay: number }) {
  return (
    <span className="block h-[1em] overflow-hidden leading-[1em]">
      <motion.span
        className="flex flex-col"
        animate={{ y: active ? `-${value}em` : '0em' }}
        transition={{ type: 'spring', stiffness: 64, damping: 13, mass: 0.9, delay }}
      >
        {Array.from({ length: 10 }, (_, d) => (
          <span key={d} className="h-[1em] leading-[1em]">{d}</span>
        ))}
      </motion.span>
    </span>
  );
}

function YearPlate({ year, active }: { year: number; active: boolean }) {
  const digits = String(year).split('').map(Number);
  return (
    <>
      {/* desktop: stacked odometer column anchored on the spine */}
      <div
        className={`hidden border bg-ink/95 px-2 py-3 font-display leading-none shadow-[0_10px_30px_rgba(0,0,0,0.55)] transition-all duration-500 md:flex md:flex-col md:items-center ${
          active
            ? 'border-blood/80 text-bone shadow-[0_0_32px_rgba(229,9,20,0.35)]'
            : 'border-line text-fog/70'
        }`}
        style={{ fontSize: 'clamp(44px, 5.4vw, 84px)' }}
      >
        {digits.map((d, i) => (
          <ODigit key={i} value={d} active={active} delay={(3 - i) * 0.05} />
        ))}
        <span className={`mt-2 font-tele text-[8px] tracking-[0.3em] ${active ? 'text-blood' : 'text-dim'}`}>
          {active ? '●REEL' : 'REEL'}
        </span>
      </div>
      {/* mobile: compact horizontal chapter plate */}
      <div
        className={`flex items-center gap-2 border bg-ink/95 px-3 py-2 font-display text-4xl leading-none md:hidden ${
          active ? 'border-blood/80 text-bone' : 'border-line text-fog/70'
        }`}
      >
        {digits.map((d, i) => (
          <ODigit key={i} value={d} active={active} delay={(3 - i) * 0.05} />
        ))}
      </div>
    </>
  );
}

/* ── one title block in the reel ───────────────────────────────────────── */

interface BlockProps {
  entry: Entry;
  order: Order;
  index: number;
  side: 'l' | 'r';
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (e: Entry) => void;
}

function ReelBlock({ entry, order, index, side, hovered, onHover, onSelect }: BlockProps) {
  const watch = order === 'watch';
  return (
    <div
      className={`group relative ${side === 'l' ? 'md:col-start-1 md:pr-[74px]' : 'md:col-start-2 md:pl-[74px]'} pl-10 md:pl-0 ${hovered ? 'z-30' : 'z-10'}`}
      style={{
        gridRow: 'auto',
        paddingTop: hovered ? 92 : 10,
        paddingBottom: hovered ? 92 : 10,
        transition: 'padding 0.32s cubic-bezier(0.22,1,0.36,1)',
      }}
      onMouseEnter={() => onHover(entry.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* connector tick to the spine */}
      <div
        className={`absolute top-1/2 hidden h-px w-[34px] -translate-y-1/2 bg-fog/40 transition-colors duration-300 group-hover:bg-blood md:block ${
          side === 'l' ? '-right-[36px]' : '-left-[36px]'
        }`}
      />
      <div
        className={`absolute top-1/2 hidden h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-fog/50 transition-all duration-300 group-hover:bg-blood group-hover:shadow-[0_0_8px_rgba(229,9,20,0.8)] md:block ${
          side === 'l' ? '-right-[39px]' : '-left-[39px]'
        }`}
      />
      <div className="absolute left-[-24px] top-1/2 h-px w-6 -translate-y-1/2 bg-fog/40 group-hover:bg-blood md:hidden" />

      <div
        className={`flex items-center gap-3.5 border-l-2 px-2 py-1.5 transition-all duration-300 ${
          hovered ? 'border-blood bg-smoke/70' : 'border-transparent'
        } ${side === 'l' ? 'md:flex-row-reverse md:text-right' : ''}`}
      >
        <ZoomPoster entry={entry} onSelect={onSelect} className="w-[64px] flex-none sm:w-[72px]" />
        <div className="min-w-0">
          <div className={`flex items-center gap-2 ${side === 'l' ? 'md:flex-row-reverse' : ''}`}>
            <span className="font-tele text-[9px] tracking-[0.2em] text-blood/90">
              #{String(index).padStart(3, '0')}
            </span>
            {entry.favorite && <Star size={10} className="fill-blood text-blood" />}
            <span className="truncate text-sm font-semibold tracking-wide text-bone">
              {entry.title}
            </span>
          </div>
          <div className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-tele text-[9.5px] tracking-[0.12em] text-fog ${side === 'l' ? 'md:flex-row-reverse' : ''}`}>
            <span className="inline-flex items-center gap-1 text-ember">
              {entry.type === 'movie' ? <Film size={10} /> : <Tv size={10} />}
              {entry.type === 'movie' ? 'FILM' : 'SERIES'}
            </span>
            <span className="text-dim">REL {entry.year ?? '––––'}</span>
            <span className="text-dim">
              {watch ? 'LOGGED' : 'PREMIERE'} {fmtDate(watch ? entry.addedAt : entry.releaseDate ?? entry.addedAt)}
            </span>
          </div>
          <div className={`mt-1 font-tele text-[9.5px] tracking-[0.12em] text-dim ${side === 'l' ? 'md:text-right' : ''}`}>
            {factLine(entry)}
            {entry.watchMinutes ? <span className="text-fog"> · ≈{fmtDur(entry.watchMinutes)}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── one year on the reel ─────────────────────────────────────────────── */

interface YearProps {
  group: YearGroup;
  order: Order;
  startIndex: number;
  maxCount: number;
  onInView: (year: number) => void;
  onSelect: (e: Entry) => void;
}

function YearSection({ group, order, startIndex, maxCount, onInView, onSelect }: YearProps) {
  const ref = useRef<HTMLElement>(null);
  const active = useInView(ref, { margin: '-42% 0px -50% 0px' });
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (active) onInView(group.year);
  }, [active, group.year, onInView]);

  const density = group.items.length / maxCount;
  const spineW = Math.round(4 + density * 22);
  const glow = `0 0 ${Math.round(8 + density * 18)}px rgba(229,9,20,${0.12 + density * 0.4})`;

  return (
    <motion.section
      ref={ref}
      id={`y${group.year}`}
      key={group.year}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      style={{ overflow: 'clip', scrollMarginTop: 132 }}
      className="cv-year relative"
    >
      {/* spine segment — thickness + glow carry this year's density */}
      <div
        className={`absolute bottom-0 left-[14px] top-0 md:left-1/2 md:-translate-x-1/2 ${active && density > 0.45 ? 'spine-hot' : ''}`}
        style={{
          width: spineW,
          background: active
            ? `linear-gradient(180deg, rgba(229,9,20,${0.35 + density * 0.55}), rgba(120,6,12,${0.4 + density * 0.5}))`
            : 'linear-gradient(180deg, rgba(229,9,20,0.16), rgba(80,8,12,0.22))',
          borderRadius: spineW / 2,
          boxShadow: active ? glow : `0 0 8px rgba(229,9,20,${0.05 + density * 0.15})`,
          transition: 'width .5s ease, box-shadow .6s ease, background .6s ease',
        }}
      />

      {/* odometer plate, anchored at the year's first cut (desktop: sticky on spine) */}
      <div className="sticky top-[128px] z-30 hidden h-0 md:block">
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: 30 }}>
          <YearPlate year={group.year} active={active} />
          <div className={`mt-2 text-center font-tele text-[9px] tracking-[0.24em] ${active ? 'text-fog' : 'text-dim'}`}>
            {group.items.length} TITLES · {Math.round(group.minutes / 60)}H
          </div>
        </div>
      </div>
      {/* mobile chapter header */}
      <div className="relative z-30 flex items-center gap-3 pl-12 pt-10 md:hidden">
        <YearPlate year={group.year} active={active} />
        <div className={`font-tele text-[9px] tracking-[0.24em] ${active ? 'text-fog' : 'text-dim'}`}>
          {group.items.length} TITLES · {Math.round(group.minutes / 60)}H ON THE {group.year} REEL
        </div>
      </div>

      {/* alternating blocks */}
      <div className="relative grid gap-y-1 pb-16 pt-6 md:grid-cols-2 md:gap-x-[150px] md:py-24">
        {group.items.map((e, i) => (
          <ReelBlock
            key={e.id}
            entry={e}
            order={order}
            index={startIndex + i + 1}
            side={i % 2 === 0 ? 'l' : 'r'}
            hovered={hovered === e.id}
            onHover={setHovered}
            onSelect={onSelect}
          />
        ))}
      </div>
    </motion.section>
  );
}

/* ── decade intermission ──────────────────────────────────────────────── */

/** vertical film-strip sprocket holes along the slide edges */
function SprocketRail({ side }: { side: 'l' | 'r' }) {
  return (
    <div
      aria-hidden
      className={`absolute inset-y-0 ${side === 'l' ? 'left-3' : 'right-3'} flex w-4 flex-col justify-evenly opacity-40`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="block h-3 w-4 rounded-[2px] border border-fog/50 bg-ink" />
      ))}
    </div>
  );
}

function Intermission({ stat }: { stat: DecadeStat }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 70 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="scanlines relative left-1/2 my-10 flex min-h-[54vh] w-screen -translate-x-1/2 flex-col items-center justify-center gap-5 overflow-hidden border-y border-line bg-black"
    >
      <SprocketRail side="l" />
      <SprocketRail side="r" />
      <div className="absolute inset-y-0 left-0 w-[14%] bg-gradient-to-r from-blood/25 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-[14%] bg-gradient-to-l from-blood/25 to-transparent" />
      <div className="font-tele text-[10px] tracking-[0.6em] text-blood">— INTERMISSION —</div>
      <div className="font-display text-[clamp(58px,11vw,160px)] uppercase leading-none text-outline">
        The {stat.decade}s
      </div>
      <div className="flex items-center gap-5 font-tele text-[10px] tracking-[0.28em] text-fog sm:text-[11px]">
        <span>{stat.titles} TITLES</span>
        <span className="h-3 w-px bg-blood/60" />
        <span>{Math.round(stat.minutes / 60).toLocaleString()} HOURS</span>
        <span className="h-3 w-px bg-blood/60" />
        <span className="hidden sm:inline">THE PROJECTIONIST CHANGES THE REEL</span>
      </div>
    </motion.div>
  );
}

/* ── sticky filter chips ──────────────────────────────────────────────── */

interface ChipsProps {
  groups: YearGroup[];
  decades: DecadeStat[];
  hidden: Set<number>;
  onToggleYear: (y: number) => void;
  onToggleDecade: (d: number) => void;
  onAll: () => void;
  onNone: () => void;
}

function ChipsBar({ groups, decades, hidden, onToggleYear, onToggleDecade, onAll, onNone }: ChipsProps) {
  const visible = groups.reduce((s, g) => s + (hidden.has(g.year) ? 0 : g.items.length), 0);
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  const chip = 'rounded-full border px-2.5 py-1 font-tele text-[9.5px] tracking-[0.14em] transition-all duration-200';
  return (
    <div className="sticky top-[57px] z-[62] border-b border-line bg-ink/88 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-1.5 px-4 py-2.5 sm:px-8">
        <span className="mr-1 font-tele text-[9px] tracking-[0.3em] text-dim">REEL FILTER</span>
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
        <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
        {groups.map((g) => {
          const off = hidden.has(g.year);
          return (
            <button
              key={g.year}
              onClick={() => onToggleYear(g.year)}
              className={`${chip} ${off ? 'border-line text-dim line-through opacity-50' : 'border-fog/40 text-bone hover:border-blood/70'}`}
              title={`${g.items.length} titles`}
            >
              {g.year}
              <span className={`ml-1 ${off ? 'text-dim' : 'text-blood'}`}>{g.items.length}</span>
            </button>
          );
        })}
        <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
        <button onClick={onAll} className="font-tele text-[9.5px] tracking-[0.2em] text-blood underline-offset-4 hover:underline">ALL</button>
        <button onClick={onNone} className="font-tele text-[9.5px] tracking-[0.2em] text-dim underline-offset-4 hover:text-bone hover:underline">NONE</button>
        <span className="ml-auto hidden font-tele text-[9px] tracking-[0.2em] text-dim lg:block">
          SHOWING {visible}/{total} TITLES · REEL SHORTENS LIVE
        </span>
      </div>
    </div>
  );
}

/* ── seek-bar scrubber rail ───────────────────────────────────────────── */

interface RailProps {
  groups: YearGroup[];
  hidden: Set<number>;
  activeYear: number | null;
  container: React.RefObject<HTMLDivElement | null>;
}

function ScrubberRail({ groups, hidden, activeYear, container }: RailProps) {
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start 0.5', 'end 0.6'],
  });
  const max = Math.max(...groups.map((g) => g.items.length));
  const jump = (y: number) => {
    if (hidden.has(y)) return;
    document.getElementById(`y${y}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <div className="fixed right-4 top-1/2 z-[64] hidden -translate-y-1/2 items-center lg:flex xl:right-8">
      <div className="relative h-[46vh] w-[3px] rounded-full bg-smoke">
        <motion.div
          className="absolute inset-x-0 top-0 h-full origin-top rounded-full bg-blood shadow-[0_0_10px_rgba(229,9,20,0.6)]"
          style={{ scaleY: scrollYProgress }}
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
                className={`block rounded-full transition-all duration-300 ${
                  off
                    ? 'bg-ash opacity-30'
                    : active
                      ? 'bg-blood shadow-[0_0_14px_rgba(229,9,20,0.9)]'
                      : 'bg-fog/60 group-hover:bg-bone'
                }`}
                style={{ width: size, height: size, transform: active ? 'scale(1.35)' : undefined }}
              />
              <span
                className={`pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 whitespace-nowrap font-tele text-[9px] tracking-[0.2em] transition-opacity duration-200 ${
                  active ? 'text-blood opacity-100' : 'text-fog opacity-0 group-hover:opacity-100'
                }`}
              >
                {g.year}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── the view ──────────────────────────────────────────────────────────── */

export default function Reel({
  items, order, onSelect,
}: {
  items: Entry[]; order: Order; onSelect: (e: Entry) => void;
}) {
  const groups = useMemo(() => groupByYear(items, order), [items, order]);
  const decades = useMemo(() => decadeStats(groups), [groups]);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* an order flip re-groups years entirely — stale selections would be lies */
  useEffect(() => setHidden(new Set()), [order]);

  const onInView = useCallback((y: number) => setActiveYear(y), []);
  const maxCount = useMemo(() => Math.max(...groups.map((g) => g.items.length)), [groups]);

  const toggleYear = useCallback((y: number) => {
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(y)) n.delete(y); else n.add(y);
      return n;
    });
  }, []);
  const toggleDecade = useCallback((d: number) => {
    setHidden((h) => {
      const n = new Set(h);
      const ys = groups.filter((g) => Math.floor(g.year / 10) * 10 === d).map((g) => g.year);
      const allIn = ys.every((y) => !n.has(y));
      ys.forEach((y) => { if (allIn) n.add(y); else n.delete(y); });
      return n;
    });
  }, [groups]);

  const visible = groups.filter((g) => !hidden.has(g.year));

  const startIndices = useMemo(() => {
    const m = new Map<number, number>();
    let acc = 0;
    for (const g of visible) { m.set(g.year, acc); acc += g.items.length; }
    return m;
  }, [visible]);

  return (
    <section className="relative border-t border-line">
      <div className="mx-auto max-w-[1600px] px-4 pb-2 pt-14 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-tele text-[10px] tracking-[0.4em] text-blood">VIEW 02</div>
            <h2 className="mt-1 font-display text-4xl uppercase tracking-wide text-bone sm:text-6xl">
              The <span className="text-outline-red">Reel</span>
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-fog">
              Every title in line, year by year. The spine thickens where your
              attention did. Kill a year in the filter and the reel physically shortens.
            </p>
          </div>
          <div className="text-right font-tele text-[10px] leading-relaxed tracking-[0.18em] text-dim">
            <div>SPINE WIDTH ∝ TITLES/YEAR</div>
            <div className="mt-1">DRAG-SCRUB VIA RAIL →</div>
          </div>
        </div>
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

      <div ref={containerRef} className="relative mx-auto max-w-[1200px] px-4 sm:px-8">
        <AnimatePresence initial={false}>
          {visible.map((g, vi) => {
            const prev = visible[vi - 1];
            const decadeChanged = !prev || Math.floor(prev.year / 10) !== Math.floor(g.year / 10);
            const stat = decades.find((d) => d.decade === Math.floor(g.year / 10) * 10)!;
            return (
              <Fragment key={g.year}>
                {decadeChanged && <Intermission key={`int-${stat.decade}`} stat={stat} />}
                <YearSection
                  key={g.year}
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
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
            <div className="font-display text-3xl uppercase text-outline">Reel empty</div>
            <div className="font-tele text-[10px] tracking-[0.25em] text-dim">
              EVERY YEAR IS FILTERED OUT — HIT ALL TO THREAD THE PROJECTOR
            </div>
          </div>
        )}

        <div className="py-16 text-center">
          <div className="font-display text-2xl tracking-[0.2em] text-bone">FIN</div>
          <div className="mt-2 font-tele text-[9px] tracking-[0.3em] text-dim">
            {visible.reduce((s, g) => s + g.items.length, 0)} TITLES SHOWN · TO BE CONTINUED
          </div>
        </div>
      </div>

      <ScrubberRail groups={groups} hidden={hidden} activeYear={activeYear} container={containerRef} />
    </section>
  );
}
