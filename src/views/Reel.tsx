import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useInView, useScroll, useTransform } from 'framer-motion';
import { Poster } from '../components/Poster';
import {
  decadeStats,
  fmtDate,
  fmtDur,
  fmtInt,
  groupByYear,
  watchMinutes,
  type DecadeStat,
  type Dir,
  type Entry,
  type Order,
  type YearGroup,
} from '../data/library';

/* ── odometer digit: rolls into place once ─────────────────────────────── */
function ODigit({ value, delay }: { value: number; delay: number }) {
  return (
    <span className="relative block overflow-hidden" style={{ height: '0.84em' }}>
      {/* the final digit sizes the window, so a narrow "1" doesn't leave a gap */}
      <span className="invisible block" style={{ lineHeight: 0.84 }}>{value}</span>
      <motion.span
        className="absolute inset-x-0 top-0 block text-center"
        initial={{ y: '0em' }}
        whileInView={{ y: `${-value * 0.84}em` }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ type: 'spring', stiffness: 80, damping: 16, delay }}
      >
        {Array.from({ length: 10 }, (_, d) => (
          <span key={d} className="block" style={{ height: '0.84em', lineHeight: 0.84 }}>
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function YearPlate({ group, share }: { group: YearGroup; share: number }) {
  return (
    <div className="relative z-20 flex flex-col items-start bg-ink py-2 pr-4 md:items-center md:px-6">
      <div className="flex font-display text-[clamp(64px,9vw,112px)] font-extrabold text-bone" aria-label={String(group.year)}>
        {String(group.year)
          .split('')
          .map((d, i) => (
            <ODigit key={i} value={Number(d)} delay={i * 0.08} />
          ))}
      </div>
      <div className="label mt-2 text-[9.5px] text-dim">
        <span className="text-bone">{group.items.length}</span> titles · {fmtInt(group.minutes / 60)}h · {share}% of the log
      </div>
    </div>
  );
}

/* ── one title row ─────────────────────────────────────────────────────── */
function ReelRow({
  entry,
  num,
  side,
  order,
  onSelect,
}: {
  entry: Entry;
  num: number;
  side: 'l' | 'r';
  order: Order;
  onSelect: (e: Entry) => void;
}) {
  const total = watchMinutes(entry);
  const left = side === 'l';
  return (
    <motion.div
      className="group relative mt-1"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* connector to the spine */}
      <span
        className={`absolute top-1/2 hidden h-px w-6 bg-line transition-colors group-hover:bg-blood md:block ${left ? 'right-1/2 mr-1' : 'left-1/2 ml-1'}`}
      />
      <span className="absolute left-[3px] top-1/2 z-10 h-1 w-1 -translate-y-1/2 rounded-full bg-rule transition-colors group-hover:bg-blood md:left-1/2 md:-translate-x-1/2" />

      <div className={`relative pl-6 md:w-[calc(50%-36px)] md:pl-0 ${left ? 'md:mr-auto' : 'md:ml-auto'}`}>
        <div className={`flex items-center gap-4 py-2 sm:gap-5 ${left ? 'md:flex-row-reverse' : ''}`}>
          <motion.button
            type="button"
            onClick={() => onSelect(entry)}
            aria-label={`${entry.title}${entry.year ? ` (${entry.year})` : ''}`}
            whileHover={{ scale: 1.9, zIndex: 60 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="relative block aspect-[2/3] w-[58px] shrink-0 cursor-pointer sm:w-[72px]"
            style={{ zIndex: 2 }}
          >
            <Poster entry={entry} className="h-full w-full outline outline-1 -outline-offset-1 outline-white/10" />
          </motion.button>

          <div className={`min-w-0 ${left ? 'md:text-right' : ''}`}>
            <div className={`label flex items-center gap-2 text-[9px] ${left ? 'md:justify-end' : ''}`}>
              <span className="tabular-nums text-dim">#{String(num).padStart(3, '0')}</span>
              <span className="text-blood">{entry.type === 'movie' ? 'Film' : 'Series'}</span>
              <span className="text-dim">{entry.year ?? '—'}</span>
            </div>
            <h3 onClick={() => onSelect(entry)} className="mt-1 cursor-pointer truncate text-[17px] font-semibold tracking-tight text-bone sm:text-xl">
              {entry.title}
            </h3>
            <div className="label mt-1 text-[9px] text-dim">
              {order === 'watch' ? 'Started' : 'Premiered'} {fmtDate(order === 'watch' ? entry.addedAt : entry.releaseDate)}
              <span className="mx-1.5 text-rule">/</span>
              {entry.type === 'movie' ? fmtDur(total) : `${entry.episodes ?? '—'} ep · ≈${fmtDur(total)}`}
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
  total,
  order,
  onSelect,
}: {
  group: YearGroup;
  startIndex: number;
  maxCount: number;
  total: number;
  order: Order;
  onSelect: (e: Entry) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const active = useInView(ref, { margin: '-40% 0px -50% 0px' });

  const density = group.items.length / maxCount;
  const w = Math.round(1 + density * 7);

  return (
    <section id={`y${group.year}`} ref={ref} className="relative scroll-mt-32 pb-16">
      {/* spine segment — width carries the year's density */}
      <div
        className="absolute bottom-0 left-[5px] top-0 -translate-x-1/2 transition-[background-color,width] duration-500 md:left-1/2"
        style={{ width: w, background: active ? 'var(--color-blood)' : 'var(--color-rule)', opacity: active ? 0.9 : 0.6 }}
      />
      <div className="relative z-10 flex pt-8 md:justify-center">
        <YearPlate group={group} share={Math.max(1, Math.round((group.items.length / total) * 100))} />
      </div>
      <div className="relative z-10 pt-6">
        {group.items.map((e, i) => (
          <ReelRow key={e.id} entry={e} num={startIndex + i + 1} side={i % 2 === 0 ? 'l' : 'r'} order={order} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

/* ── decade intermission ───────────────────────────────────────────────── */
function Intermission({ stat, groups }: { stat: DecadeStat; groups: YearGroup[] }) {
  const counts = Array.from({ length: 10 }, (_, i) => groups.find((g) => g.year === stat.decade + i)?.items.length ?? 0);
  const max = Math.max(...counts, 1);
  return (
    <motion.div
      className="relative z-20 my-12 grid gap-8 border-y border-line bg-ink py-12 md:grid-cols-[1fr_auto] md:items-end"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.7 }}
    >
      <div>
        <div className="label text-blood">Intermission</div>
        <div className="mt-3 font-display text-[clamp(56px,8vw,104px)] font-extrabold uppercase leading-[0.84] text-bone">
          The {stat.decade}s
        </div>
        <div className="label mt-4 text-fog">
          {stat.titles} titles · {fmtInt(stat.minutes / 60)} hours
        </div>
      </div>
      <div aria-label={`Titles per year in the ${stat.decade}s`}>
        <div className="flex h-20 items-end gap-1.5">
          {counts.map((c, i) => (
            <motion.span
              key={i}
              title={`${stat.decade + i}: ${c} titles`}
              className={`w-4 rounded-t-[2px] ${c ? 'bg-bone/80' : 'bg-line'}`}
              initial={{ height: 1 }}
              whileInView={{ height: c ? Math.max(3, (c / max) * 80) : 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 border-t border-line pt-2">
          {counts.map((_, i) => (
            <span key={i} className="w-4 text-center font-tele text-[8.5px] text-dim">
              {i}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── seek rail: one dot per year, positioned by content weight ─────────── */
function ScrubberRail({ groups, container }: { groups: YearGroup[]; container: React.RefObject<HTMLDivElement | null> }) {
  const { scrollYProgress } = useScroll({ target: container, offset: ['start 0.5', 'end 0.6'] });
  const thumbTop = useTransform(scrollYProgress, (x) => `${x * 100}%`);
  const max = Math.max(...groups.map((g) => g.items.length), 1);
  const fracs = useMemo(() => {
    const BASE = 3; // plate + breathing room per year, in title units
    const totalW = groups.reduce((s, g) => s + g.items.length + BASE, 0) || 1;
    let acc = 0;
    return groups.map((g) => {
      const f = acc / totalW;
      acc += g.items.length + BASE;
      return f;
    });
  }, [groups]);

  const [inReel, setInReel] = useState(false);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInReel(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [container]);

  const [current, setCurrent] = useState<number | null>(null);
  useEffect(() => {
    if (!inReel) return;
    return scrollYProgress.on('change', (p) => {
      let y: number | null = null;
      for (let i = 0; i < fracs.length && p >= fracs[i]; i++) y = groups[i].year;
      setCurrent(y);
    });
  }, [inReel, groups, fracs, scrollYProgress]);

  const jump = (y: number) => {
    const el = document.getElementById(`y${y}`);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
  };

  if (!groups.length) return null;
  /* portalled so no transformed ancestor can hijack position: fixed */
  return createPortal(
    <AnimatePresence>
      {inReel && (
        <motion.nav
          aria-label="Seek by year"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.3 }}
          className="fixed right-1 top-[calc(50%+40px)] z-30 flex h-[56vh] max-h-[520px] -translate-y-1/2 flex-col items-center md:right-5 md:top-[calc(50%+50px)] md:h-[50vh]"
        >
          <span className="label mb-3 hidden text-[8px] text-dim md:block">Seek</span>
          <div className="relative w-6 flex-1 md:w-16">
            <div className="absolute inset-y-0 left-[9px] w-px bg-line" />
            <motion.div className="absolute left-[9px] h-px w-3 -translate-x-1/2 bg-blood" style={{ top: thumbTop }} />
            {groups.map((g, i) => {
              const on = current === g.year;
              const size = 3 + (g.items.length / max) * 5;
              return (
                <button
                  key={g.year}
                  type="button"
                  onClick={() => jump(g.year)}
                  aria-label={`Jump to ${g.year}`}
                  className="group absolute left-0 flex h-6 -translate-y-1/2 cursor-pointer items-center gap-2.5 md:h-auto"
                  style={{ top: `${fracs[i] * 100}%` }}
                >
                  <span className="grid w-[19px] place-items-center">
                    <span
                      className={`block rounded-full transition-colors ${on ? 'bg-blood' : 'bg-dim group-hover:bg-bone'}`}
                      style={{ width: size, height: size }}
                    />
                  </span>
                  <span
                    className={`font-tele text-[10px] tracking-[0.12em] transition-colors ${on ? 'text-bone' : 'text-dim group-hover:text-fog'} ${
                      on ? 'absolute right-full mr-1 border border-line bg-ink px-1.5 py-0.5' : 'hidden'
                    } md:static md:mr-0 md:block md:border-0 md:bg-transparent md:p-0`}
                  >
                    {g.year}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ── the view ──────────────────────────────────────────────────────────── */
export default function Reel({
  items,
  order,
  dir,
  onSelect,
}: {
  items: Entry[];
  order: Order;
  dir: Dir;
  onSelect: (e: Entry) => void;
}) {
  const asc = useMemo(() => groupByYear(items, order), [items, order]);
  const groups = useMemo(() => (dir === 'asc' ? asc : [...asc].reverse()), [asc, dir]);
  const decades = useMemo(() => decadeStats(asc), [asc]);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxCount = useMemo(() => Math.max(...asc.map((g) => g.items.length), 1), [asc]);

  /* numbering always threads ascending, so #NNN stays put when flipped */
  const startIndices = useMemo(() => {
    const m = new Map<number, number>();
    let acc = 0;
    for (const g of asc) {
      m.set(g.year, acc);
      acc += g.items.length;
    }
    return m;
  }, [asc]);

  return (
    <div ref={containerRef} className="relative">
      <ScrubberRail groups={groups} container={containerRef} />
      <div className="relative mx-auto max-w-6xl pb-10 pl-4 pr-9 sm:pl-5 md:px-5">
        {groups.map((g, vi) => {
          const prev = groups[vi - 1];
          const decadeChanged = !prev || Math.floor(prev.year / 10) !== Math.floor(g.year / 10);
          const stat = decades.find((d) => d.decade === Math.floor(g.year / 10) * 10)!;
          return (
            <Fragment key={g.year}>
              {decadeChanged && <Intermission stat={stat} groups={asc} />}
              <YearSection
                group={g}
                startIndex={startIndices.get(g.year) ?? 0}
                maxCount={maxCount}
                total={items.length}
                order={order}
                onSelect={onSelect}
              />
            </Fragment>
          );
        })}
        <div className="pt-10 text-center">
          <div className="font-display text-5xl font-extrabold tracking-[0.3em] text-rule">FIN</div>
          <div className="label mt-2 text-[9px] text-dim">{items.length} titles · to be continued</div>
        </div>
      </div>
    </div>
  );
}
