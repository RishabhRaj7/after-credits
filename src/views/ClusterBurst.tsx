import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useMotionValueEvent, useScroll, useSpring } from 'framer-motion';
import { Poster } from '../components/Poster';
import Plexus from '../components/Plexus';
import ScrambleText from '../components/ScrambleText';
import MobileTrack from './MobileTrack';
import { quipFor } from '../data/quips';
import {
  clusterize,
  fmtDate,
  fmtDur,
  fmtInt,
  fmtMonth,
  intensityFor,
  watchMinutes,
  yearOf,
  type Cluster,
  type Dir,
  type Entry,
  type Order,
} from '../data/library';

const VB_W = 1000;
const LEFT_X = 330;
const RIGHT_X = 670;
const FAN_MAX = 6; // larger clusters render as a contact sheet
const SHEET_ROWS = 2; // rows shown before "show all"
const NARROW = 860;
const GAP = 10;
const EASE = [0.16, 1, 0.3, 1] as const;

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(() => Math.min(window.innerWidth, 1200));
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

interface Sheet {
  cols: number;
  thumb: number;
  shown: number;
  height: number;
}
interface Node {
  cluster: Cluster;
  x: number;
  y: number;
  side: 'l' | 'r';
  sheet: Sheet | null;
  seen: number; // titles passed once this node is reached
}
interface YearBreak {
  year: number;
  y: number;
  align: 'left' | 'right';
}

function sheetFor(c: Cluster, width: number, expanded: boolean): Sheet {
  const thumb = Math.round(Math.max(62, Math.min(92, width / 13)));
  const cols = Math.max(4, Math.floor((width + GAP) / (thumb + GAP)));
  const shown = expanded ? c.size : Math.min(c.size, cols * SHEET_ROWS);
  const rows = Math.ceil(shown / cols);
  return { cols, thumb, shown, height: rows * (thumb * 1.5 + GAP) + (c.size > cols * SHEET_ROWS ? 64 : 12) };
}

function buildGeo(clusters: Cluster[], order: Order, width: number, pw: number, expanded: Set<string>) {
  const nodes: Node[] = [];
  const breaks: YearBreak[] = [];
  if (!clusters.length) return { nodes, breaks, H: 280, d: '' };
  const ph = pw * 1.5;
  /* `y` is the top of free space; each year numeral gets its own band, and
     a fan's caption + posters sit above its anchor dot */
  let y = 40;
  let seen = 0;
  let prevYear: number | null = null;
  clusters.forEach((c, i) => {
    const side: 'l' | 'r' = i % 2 === 0 ? 'l' : 'r';
    const x = side === 'l' ? LEFT_X : RIGHT_X;
    const yr = yearOf(c.items[0], order);
    if (yr !== prevYear) {
      if (prevYear !== null) y += 60;
      breaks.push({ year: yr, y, align: side === 'l' ? 'right' : 'left' });
      y += 150;
      prevYear = yr;
    }
    seen += c.size;
    if (c.size > FAN_MAX) {
      const sheet = sheetFor(c, width, expanded.has(c.key));
      nodes.push({ cluster: c, x, y: y + 10, side, sheet, seen });
      const caption = order === 'watch' && c.kind === 'backlog' ? 250 : 190;
      y += 10 + caption + sheet.height + 200;
    } else {
      const anchor = y + ph + 90;
      nodes.push({ cluster: c, x, y: anchor, side, sheet: null, seen });
      y = anchor + (c.size > 1 ? 170 + c.size * 12 : 140);
    }
  });
  const H = y + 160;

  const pts = [{ x: nodes[0].x, y: -80 }, ...nodes.map((n) => ({ x: n.x, y: n.y })), { x: nodes[nodes.length - 1].x, y: H + 80 }];
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const dy = pts[i].y - pts[i - 1].y;
    d += ` C ${pts[i - 1].x} ${pts[i - 1].y + dy * 0.5}, ${pts[i].x} ${pts[i].y - dy * 0.5}, ${pts[i].x} ${pts[i].y}`;
  }
  return { nodes, breaks, H, d };
}

/* ── pieces ────────────────────────────────────────────────────────────── */

function Caption({ cluster, order, index, sheet }: { cluster: Cluster; order: Order; index: number; sheet?: boolean }) {
  const n = cluster.size;
  const quip = quipFor(cluster, order);
  const intensity = intensityFor(cluster, order);
  return (
    <>
      <div className="label flex items-center gap-2.5 text-[9.5px] text-fog">
        <span className="tabular-nums text-blood">K{String(index + 1).padStart(3, '0')}</span>
        <span className="h-px w-5 bg-rule" />
        {fmtMonth(cluster.startTs)}
      </div>
      <h3 className={`mt-3 font-semibold leading-[1.12] tracking-tight text-bone ${sheet ? 'max-w-[26ch] text-[clamp(26px,3vw,36px)]' : 'text-[24px] sm:text-[26px]'}`}>
        <ScrambleText text={quip.headline} duration={Math.min(1100, 350 + quip.headline.length * 12)} />
      </h3>
      <div className="label mt-3 text-[9.5px] text-dim">
        {n} {n === 1 ? 'title' : 'titles'} <span className="mx-1.5 text-rule">/</span> {fmtDur(cluster.minutes)}
        {cluster.spanDays > 1 && (
          <>
            <span className="mx-1.5 text-rule">/</span> {cluster.spanDays} days
          </>
        )}
      </div>
      {quip.aside && <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-fog">{quip.aside}</p>}
      {intensity && (
        <div className="mt-3 flex items-center gap-2.5">
          <span className="flex items-end gap-[3px]" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.span
                key={i}
                className={`w-[3px] ${i < intensity.bars ? 'bg-blood' : 'bg-line'}`}
                initial={{ height: 3 }}
                whileInView={{ height: i < intensity.bars ? 5 + i * 2.5 : 3 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.07, type: 'spring', stiffness: 260, damping: 18 }}
              />
            ))}
          </span>
          <span className="label text-[9px] text-dim">{intensity.label}</span>
        </div>
      )}
    </>
  );
}

/* poster with a HUD tag that appears (and scales with it) on hover */
function HudPoster({ entry, onSelect, scale }: { entry: Entry; onSelect: (e: Entry) => void; scale: number }) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(entry)}
      aria-label={`${entry.title}${entry.year ? ` (${entry.year})` : ''}`}
      whileHover={{ scale, zIndex: 60 }}
      whileTap={{ scale: scale * 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="group relative block h-full w-full cursor-pointer"
      style={{ zIndex: 2 }}
    >
      <Poster entry={entry} className="h-full w-full outline outline-1 -outline-offset-1 outline-white/10" />
      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden>
        <span className="absolute -left-[3px] -top-[3px] h-2 w-2 border-l border-t border-blood" />
        <span className="absolute -right-[3px] -top-[3px] h-2 w-2 border-r border-t border-blood" />
        <span className="absolute -bottom-[3px] -left-[3px] h-2 w-2 border-b border-l border-blood" />
        <span className="absolute -bottom-[3px] -right-[3px] h-2 w-2 border-b border-r border-blood" />
        <span className="absolute left-0 top-full mt-[3px] block max-w-[160%] truncate whitespace-nowrap bg-ink px-[3px] py-[1px] text-left font-tele text-[5.5px] uppercase leading-tight tracking-[0.08em] text-bone">
          {entry.title}
          <span className="block text-dim">
            {entry.year ?? '—'} · {entry.type === 'movie' ? 'film' : `${entry.episodes ?? '—'} ep`} · {fmtDur(watchMinutes(entry))}
          </span>
        </span>
      </span>
    </motion.button>
  );
}

function Anchor({ x, y, setRef }: { x: number; y: number; setRef: (el: HTMLSpanElement | null) => void }) {
  return (
    <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${x / 10}%`, top: y }}>
      <span
        ref={setRef}
        data-lit="false"
        className="group/anchor relative flex h-3 w-3 items-center justify-center rounded-full border border-rule bg-ink transition-colors duration-300 data-[lit=true]:border-blood"
      >
        <span className="h-1 w-1 rounded-full bg-rule transition-colors duration-300 group-data-[lit=true]/anchor:bg-blood" />
        <span className="absolute inset-[-7px] rounded-full border border-blood opacity-0 transition-all duration-500 group-data-[lit=true]/anchor:inset-[-4px] group-data-[lit=true]/anchor:opacity-40" />
      </span>
    </div>
  );
}

/* corner brackets that frame a knot once it bursts */
function Brackets({ w, h, on, label }: { w: number; h: number; on: boolean; label: string }) {
  const c = 'absolute h-3 w-3 border-bone/40';
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: -w / 2, top: -h / 2, width: w, height: h }}
      initial={{ opacity: 0, scale: 1.08 }}
      animate={on ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.08 }}
      transition={{ duration: 0.6, delay: 0.25, ease: EASE }}
      aria-hidden
    >
      <span className={`${c} left-0 top-0 border-l border-t`} />
      <span className={`${c} right-0 top-0 border-r border-t`} />
      <span className={`${c} bottom-0 left-0 border-b border-l`} />
      <span className={`${c} bottom-0 right-0 border-b border-r`} />
      <span className="absolute -top-4 left-0 font-tele text-[8.5px] tracking-[0.18em] text-dim">{label}</span>
    </motion.div>
  );
}

/* a small knot: posters fan open, wired back to the track */
function FanNode({
  node,
  index,
  pw,
  order,
  onSelect,
  setAnchor,
}: {
  node: Node;
  index: number;
  pw: number;
  order: Order;
  onSelect: (e: Entry) => void;
  setAnchor: (el: HTMLSpanElement | null) => void;
}) {
  const { cluster, x, y, side } = node;
  const items = cluster.items;
  const n = items.length;
  const ph = pw * 1.5;
  const step = n > 1 ? Math.min(pw * 0.62, 380 / (n - 1)) : 0;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-22% 0px -22% 0px', once: true });
  const lift = ph / 2 + 56; // fan centre sits this far above the anchor
  const spread = ((n - 1) / 2) * step;

  return (
    <>
      <Anchor x={x} y={y} setRef={setAnchor} />
      <div
        className="absolute w-[34%] min-w-[240px] max-w-[380px]"
        style={{ top: y - ph - 60, ...(side === 'l' ? { left: '57%' } : { right: '57%' }) }}
      >
        <motion.div
          initial={{ opacity: 0, x: side === 'l' ? 20 : -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Caption cluster={cluster} order={order} index={index} />
        </motion.div>
      </div>
      <div ref={ref} className="absolute h-0.5 w-0.5" style={{ left: `${x / 10}%`, top: y - lift }}>
        {/* wires from the anchor to each poster */}
        <svg className="pointer-events-none absolute overflow-visible" style={{ left: 0, top: 0 }} width={1} height={1} aria-hidden>
          {items.map((e, i) => {
            const k = i - (n - 1) / 2;
            return (
              <motion.line
                key={e.id}
                x1={0}
                y1={lift}
                x2={k * step}
                y2={k * k * 3 + ph / 2}
                stroke="var(--color-blood)"
                strokeOpacity={0.55}
                strokeWidth={1}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: inView ? 1 : 0 }}
                transition={{ duration: 0.5, delay: 0.05 * i, ease: EASE }}
              />
            );
          })}
        </svg>
        {n > 1 && <Brackets w={spread * 2 + pw + 48} h={ph + 48 + spread * 0.25} on={inView} label={`${n} × ${fmtDur(cluster.minutes)}`} />}
        {items.map((e, i) => {
          const k = i - (n - 1) / 2;
          return (
            <motion.div
              key={e.id}
              className="absolute"
              style={{ left: -pw / 2, top: -ph / 2, width: pw, height: ph, zIndex: i + 1 }}
              whileHover={{ zIndex: 60 }}
              initial={{ x: 0, y: 30, rotate: 0, scale: 0.4, opacity: 0, clipPath: 'inset(100% 0 0 0)' }}
              animate={
                inView
                  ? { x: k * step, y: k * k * 3, rotate: k * 6.5, scale: 1, opacity: 1, clipPath: 'inset(0% 0 0 0)' }
                  : { x: 0, y: 30, rotate: 0, scale: 0.4, opacity: 0, clipPath: 'inset(100% 0 0 0)' }
              }
              transition={{
                type: 'spring',
                stiffness: 170,
                damping: 20,
                delay: 0.15 + 0.07 * i,
                clipPath: { duration: 0.5, delay: 0.15 + 0.07 * i, ease: EASE },
              }}
            >
              <HudPoster entry={e} onSelect={onSelect} scale={1.7} />
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

/* a big cluster: laid out flat as a contact sheet, swept by a scan line */
function SheetNode({
  node,
  index,
  order,
  expanded,
  onToggle,
  onSelect,
  setAnchor,
}: {
  node: Node;
  index: number;
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (e: Entry) => void;
  setAnchor: (el: HTMLSpanElement | null) => void;
}) {
  const { cluster, x, y } = node;
  const sheet = node.sheet!;
  const more = cluster.size - sheet.shown;
  const gridRef = useRef<HTMLDivElement>(null);
  const inView = useInView(gridRef, { once: true, margin: '-15% 0px' });
  return (
    <>
      <Anchor x={x} y={y} setRef={setAnchor} />
      <div className="absolute inset-x-0 z-40 bg-ink" style={{ top: y + 30 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="border-t border-line pt-5"
        >
          <Caption cluster={cluster} order={order} index={index} sheet />
        </motion.div>
        <div ref={gridRef} className="relative mt-6">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${sheet.cols}, ${sheet.thumb}px)`, gap: GAP, justifyContent: 'space-between' }}>
            {cluster.items.slice(0, sheet.shown).map((e, i) => {
              const row = Math.floor(i / sheet.cols);
              const col = i % sheet.cols;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, scale: 0.7, filter: 'grayscale(1) brightness(2)' }}
                  animate={inView ? { opacity: 1, scale: 1, filter: 'grayscale(0) brightness(1)' } : undefined}
                  transition={{ duration: 0.5, delay: Math.min(row + col, 40) * 0.035, ease: EASE }}
                  whileHover={{ zIndex: 60 }}
                  className="relative"
                  style={{ width: sheet.thumb, height: sheet.thumb * 1.5 }}
                >
                  <HudPoster entry={e} onSelect={onSelect} scale={1.9} />
                </motion.div>
              );
            })}
          </div>
          {inView && (
            <motion.span
              className="pointer-events-none absolute inset-x-0 z-[70] h-px bg-blood"
              initial={{ top: '0%', opacity: 1 }}
              animate={{ top: '100%', opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeInOut' }}
              aria-hidden
            />
          )}
        </div>
        {cluster.size > sheet.cols * SHEET_ROWS && (
          <button
            type="button"
            onClick={onToggle}
            className="label mt-5 flex h-9 cursor-pointer items-center border border-line px-4 text-fog transition-colors hover:border-rule hover:text-bone"
          >
            {expanded ? 'Fold the sheet' : `Show all ${cluster.size} — ${more} more`}
          </button>
        )}
      </div>
    </>
  );
}

/* ── the view ──────────────────────────────────────────────────────────── */

export default function ClusterBurst({
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
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const isNarrow = width < NARROW;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const clusters = useMemo(() => clusterize(items, order), [items, order]);
  const ordered = useMemo(() => (dir === 'asc' ? clusters : [...clusters].reverse()), [clusters, dir]);
  const pw = Math.max(92, Math.min(140, width * 0.12));
  const geo = useMemo(() => buildGeo(ordered, order, width, pw, expanded), [ordered, order, width, pw, expanded]);
  const yearInfo = useMemo(() => {
    const m = new Map<number, { n: number; min: number }>();
    for (const c of clusters) {
      const y = yearOf(c.items[0], order);
      const r = m.get(y) ?? { n: 0, min: 0 };
      r.n += c.size;
      r.min += c.minutes;
      m.set(y, r);
    }
    return m;
  }, [clusters, order]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.6', 'end 0.6'] });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 27, restDelta: 0.0004 });

  /* the playhead: rides the track, lights anchors it has passed and reads
     out the date + running count of wherever it is */
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const anchors = useRef<Array<HTMLSpanElement | null>>([]);
  const lenRef = useRef(0);
  const place = (v: number) => {
    if (!pathRef.current || !dotRef.current || !lenRef.current) return;
    const pt = pathRef.current.getPointAtLength(Math.min(1, Math.max(0, v)) * lenRef.current);
    dotRef.current.style.left = `${pt.x / 10}%`;
    dotRef.current.style.top = `${pt.y}px`;
    let idx = -1;
    for (let i = 0; i < geo.nodes.length && geo.nodes[i].y <= pt.y + 2; i++) idx = i;
    anchors.current.forEach((el, i) => el && (el.dataset.lit = String(i <= idx)));
    const node = geo.nodes[Math.max(0, idx)];
    if (node && dateRef.current && countRef.current) {
      const d = new Date(node.cluster.startTs);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dateRef.current.textContent = idx < 0 ? 'STANDBY' : fmtDate(iso).replace(/ /g, '·');
      countRef.current.textContent = `${String(idx < 0 ? 0 : node.seen).padStart(3, '0')}/${String(items.length).padStart(3, '0')}`;
    }
  };
  useEffect(() => {
    if (!pathRef.current) return;
    lenRef.current = pathRef.current.getTotalLength();
    place(progress.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, isNarrow]);
  useMotionValueEvent(progress, 'change', place);

  const toggle = (key: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  return (
    <div className="relative">
      {/* the constellation rides along behind the whole track */}
      {!isNarrow && (
        <div className="pointer-events-none sticky top-0 z-0 -mb-[100vh] h-screen opacity-80">
          <Plexus />
        </div>
      )}
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-10 sm:px-5">
        <div ref={ref} className="relative" style={{ height: isNarrow ? 'auto' : geo.H }}>
          {isNarrow ? (
            <MobileTrack clusters={ordered} order={order} onSelect={onSelect} />
          ) : (
            <>
              <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VB_W} ${geo.H}`} preserveAspectRatio="none" fill="none" aria-hidden>
                <path d={geo.d} stroke="#3a3a42" strokeWidth={1} strokeDasharray="2 7" vectorEffect="non-scaling-stroke" className="track-flow" />
                <motion.path ref={pathRef} d={geo.d} stroke="#ff4533" strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ pathLength: progress }} />
              </svg>

              {/* HUD playhead */}
              <div ref={dotRef} className="absolute z-30 -translate-x-1/2 -translate-y-1/2" style={{ left: `${geo.nodes[0]?.x / 10}%`, top: 0 }} aria-hidden>
                <span className="relative block h-7 w-7">
                  <svg viewBox="0 0 28 28" className="spin-slow absolute inset-0">
                    <circle cx="14" cy="14" r="12.5" fill="none" stroke="var(--color-blood)" strokeWidth="1" strokeDasharray="3 4" />
                  </svg>
                  <span className="absolute left-1/2 top-0 h-1.5 w-px -translate-x-1/2 bg-blood" />
                  <span className="absolute bottom-0 left-1/2 h-1.5 w-px -translate-x-1/2 bg-blood" />
                  <span className="absolute left-0 top-1/2 h-px w-1.5 -translate-y-1/2 bg-blood" />
                  <span className="absolute right-0 top-1/2 h-px w-1.5 -translate-y-1/2 bg-blood" />
                  <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blood" />
                </span>
                <span className="absolute left-9 top-1/2 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap border border-line bg-ink px-2 py-1 font-tele text-[9px] tracking-[0.14em]">
                  <span className="blink h-1 w-1 bg-blood" />
                  <span ref={dateRef} className="text-bone">STANDBY</span>
                  <span className="text-rule">|</span>
                  <span ref={countRef} className="tabular-nums text-dim">000/000</span>
                </span>
              </div>

              {geo.breaks.map((b) => {
                const info = yearInfo.get(b.year);
                return (
                  <motion.div
                    key={b.year}
                    className={`absolute flex items-end gap-4 ${b.align === 'right' ? 'right-0 flex-row-reverse text-right' : 'left-0'}`}
                    style={{ top: b.y }}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-15% 0px' }}
                    transition={{ duration: 0.7, ease: EASE }}
                  >
                    <ScrambleText text={String(b.year)} duration={600} className="font-display text-[112px] font-extrabold leading-[0.8] text-bone" />
                    {info && (
                      <span className="label mb-1 text-[9px] leading-relaxed text-dim">
                        {info.n} titles
                        <br />
                        {fmtInt(info.min / 60)} hours
                      </span>
                    )}
                  </motion.div>
                );
              })}

              {geo.nodes.map((n, i) =>
                n.sheet ? (
                  <SheetNode
                    key={n.cluster.key}
                    node={n}
                    index={i}
                    order={order}
                    expanded={expanded.has(n.cluster.key)}
                    onToggle={() => toggle(n.cluster.key)}
                    onSelect={onSelect}
                    setAnchor={(el) => (anchors.current[i] = el)}
                  />
                ) : (
                  <FanNode key={n.cluster.key} node={n} index={i} pw={pw} order={order} onSelect={onSelect} setAnchor={(el) => (anchors.current[i] = el)} />
                ),
              )}

              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-ink px-6 text-center">
                <div className="font-display text-5xl font-extrabold tracking-[0.3em] text-rule">FIN</div>
                <div className="label mt-2 text-[9px] text-dim">{items.length} titles · to be continued</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
