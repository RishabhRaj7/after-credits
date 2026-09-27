import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useMotionValueEvent, useScroll, useSpring } from 'framer-motion';
import { ZoomPoster } from '../components/Poster';
import MobileTrack from './MobileTrack';
import {
  clusterize,
  fmtDur,
  fmtInt,
  fmtMonth,
  headlineFor,
  intensityFor,
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
}
interface YearBreak {
  year: number;
  y: number;
  align: 'left' | 'right';
}

const GAP = 10;

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
    if (c.size > FAN_MAX) {
      const sheet = sheetFor(c, width, expanded.has(c.key));
      nodes.push({ cluster: c, x, y: y + 10, side, sheet });
      const caption = order === 'watch' && c.kind === 'backlog' ? 250 : 170;
      y += 10 + caption + sheet.height + 200;
    } else {
      const anchor = y + ph + 70;
      nodes.push({ cluster: c, x, y: anchor, side, sheet: null });
      y = anchor + (c.size > 1 ? 150 + c.size * 12 : 120);
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

function Caption({ cluster, order, sheet }: { cluster: Cluster; order: Order; sheet?: boolean }) {
  const n = cluster.size;
  const intensity = intensityFor(cluster, order);
  const date = order === 'watch' && cluster.kind === 'backlog' && cluster.spanDays === 1
    ? new Date(cluster.startTs).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : fmtMonth(cluster.startTs);
  return (
    <>
      <div className="label flex items-center gap-2.5 text-fog">
        <span className="h-px w-5 bg-blood" />
        {date}
      </div>
      <h3 className={`mt-3 font-semibold leading-[1.1] tracking-tight text-bone ${sheet ? 'text-[clamp(26px,3vw,36px)]' : 'text-[26px] sm:text-[28px]'}`}>
        {headlineFor(cluster, order)}
      </h3>
      <div className="label mt-3 text-[9.5px] text-dim">
        {n} {n === 1 ? 'title' : 'titles'} <span className="mx-1.5 text-rule">/</span> {fmtDur(cluster.minutes)}
        {cluster.spanDays > 1 && (
          <>
            <span className="mx-1.5 text-rule">/</span> {cluster.spanDays} days
          </>
        )}
      </div>
      {order === 'watch' && cluster.kind === 'backlog' && (
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-fog">
          Mostly logged on a single day — catching the record up, not a {n}-title binge. They sit here
          by log date; switch to <span className="text-bone">Released</span> to scatter them back across the years.
        </p>
      )}
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

/* a small knot on the track: posters fan open as it scrolls into view */
function FanNode({ node, pw, order, onSelect }: { node: Node; pw: number; order: Order; onSelect: (e: Entry) => void }) {
  const { cluster, x, y, side } = node;
  const items = cluster.items;
  const n = items.length;
  const ph = pw * 1.5;
  const step = n > 1 ? Math.min(pw * 0.62, 380 / (n - 1)) : 0;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-22% 0px -22% 0px', once: true });

  return (
    <>
      <Anchor x={x} y={y} />
      <div
        className="absolute w-[34%] min-w-[240px] max-w-[380px]"
        style={{ top: y - ph - 30, ...(side === 'l' ? { left: '57%' } : { right: '57%' }) }}
      >
        <motion.div
          initial={{ opacity: 0, x: side === 'l' ? 20 : -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Caption cluster={cluster} order={order} />
        </motion.div>
      </div>
      <div ref={ref} className="absolute h-0.5 w-0.5" style={{ left: `${x / 10}%`, top: y - ph / 2 - 36 }}>
        {items.map((e, i) => {
          const k = i - (n - 1) / 2;
          return (
            <motion.div
              key={e.id}
              className="absolute"
              style={{ left: -pw / 2, top: -ph / 2, width: pw, height: ph, zIndex: i + 1 }}
              initial={{ x: 0, y: 14, rotate: 0, scale: 0.5, opacity: 0 }}
              animate={
                inView
                  ? { x: k * step, y: k * k * 3, rotate: k * 6.5, scale: 1, opacity: 1 }
                  : { x: 0, y: 14, rotate: 0, scale: 0.5, opacity: 0 }
              }
              transition={{ type: 'spring', stiffness: 170, damping: 20, delay: 0.08 * i }}
            >
              <ZoomPoster entry={e} onClick={onSelect} hoverScale={1.7} className="h-full w-full" posterClass="h-full w-full" />
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

/* a big cluster: laid out flat as a contact sheet across the track */
function SheetNode({
  node,
  order,
  expanded,
  onToggle,
  onSelect,
}: {
  node: Node;
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (e: Entry) => void;
}) {
  const { cluster, x, y } = node;
  const sheet = node.sheet!;
  const more = cluster.size - sheet.shown;
  return (
    <>
      <Anchor x={x} y={y} />
      <div className="absolute inset-x-0 bg-ink" style={{ top: y + 30 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="border-t border-line pt-5"
          style={{ minHeight: 120 }}
        >
          <Caption cluster={cluster} order={order} sheet />
        </motion.div>
        <div
          className="mt-6 grid"
          style={{ gridTemplateColumns: `repeat(${sheet.cols}, ${sheet.thumb}px)`, gap: GAP, justifyContent: 'space-between' }}
        >
          {cluster.items.slice(0, sheet.shown).map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(i, 30) * 0.015 }}
              style={{ width: sheet.thumb, height: sheet.thumb * 1.5 }}
            >
              <ZoomPoster entry={e} onClick={onSelect} hoverScale={1.9} className="h-full w-full" posterClass="h-full w-full" />
            </motion.div>
          ))}
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

function Anchor({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${x / 10}%`, top: y }}>
      <span className="flex h-3 w-3 items-center justify-center rounded-full border border-blood bg-ink">
        <span className="h-1 w-1 rounded-full bg-blood" />
      </span>
    </div>
  );
}

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

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.6'] });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 27, restDelta: 0.0004 });

  /* playhead riding the track */
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const lenRef = useRef(0);
  const place = (v: number) => {
    if (!pathRef.current || !dotRef.current || !lenRef.current) return;
    const pt = pathRef.current.getPointAtLength(Math.min(1, Math.max(0, v)) * lenRef.current);
    dotRef.current.style.left = `${pt.x / 10}%`;
    dotRef.current.style.top = `${pt.y}px`;
  };
  useEffect(() => {
    if (!pathRef.current) return;
    lenRef.current = pathRef.current.getTotalLength();
    place(progress.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.d, isNarrow]);
  useMotionValueEvent(progress, 'change', place);

  const toggle = (key: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-5">
      <div ref={ref} className="relative" style={{ height: isNarrow ? 'auto' : geo.H }}>
        {isNarrow ? (
          <MobileTrack clusters={ordered} order={order} onSelect={onSelect} />
        ) : (
          <>
            <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${VB_W} ${geo.H}`} preserveAspectRatio="none" fill="none" aria-hidden>
              <path d={geo.d} stroke="#24242a" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <motion.path ref={pathRef} d={geo.d} stroke="#ff4533" strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={{ pathLength: progress }} />
            </svg>

            <div ref={dotRef} className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: `${geo.nodes[0]?.x / 10}%`, top: 0 }} aria-hidden>
              <span className="block h-2.5 w-2.5 rounded-full bg-blood ring-4 ring-ink" />
              <span className="label absolute left-5 top-1/2 -translate-y-1/2 text-[9px] text-blood">Now</span>
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
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="font-display text-[112px] font-extrabold leading-[0.8] text-bone">{b.year}</span>
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

            {geo.nodes.map((n) =>
              n.sheet ? (
                <SheetNode
                  key={n.cluster.key}
                  node={n}
                  order={order}
                  expanded={expanded.has(n.cluster.key)}
                  onToggle={() => toggle(n.cluster.key)}
                  onSelect={onSelect}
                />
              ) : (
                <FanNode key={n.cluster.key} node={n} pw={pw} order={order} onSelect={onSelect} />
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
  );
}
