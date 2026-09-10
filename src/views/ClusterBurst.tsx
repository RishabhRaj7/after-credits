import { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  useInView,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from 'framer-motion';
import { ZoomPoster } from '../components/Poster';
import {
  clusterize,
  fmtDur,
  fmtMonth,
  headlineFor,
  intensityFor,
  type Cluster,
  type Entry,
  type Order,
} from '../data/library';

const VB_W = 1000;
const LEFT_X = 330;
const RIGHT_X = 668;

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(960);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

interface Node {
  cluster: Cluster;
  x: number;
  y: number;
  side: 'l' | 'r';
}
interface YearBreak {
  year: number;
  y: number;
  align: 'left' | 'right';
}

function buildGeo(clusters: Cluster[]) {
  const nodes: Node[] = [];
  const breaks: YearBreak[] = [];
  let y = 210;
  let prevYear: number | null = null;
  clusters.forEach((c, i) => {
    const side: 'l' | 'r' = i % 2 === 0 ? 'l' : 'r';
    const yr = new Date(c.startTs).getFullYear();
    if (yr !== prevYear) {
      if (prevYear !== null) y += 170;
      breaks.push({ year: yr, y: y - 80, align: side === 'l' ? 'right' : 'left' });
      y += 90;
      prevYear = yr;
    }
    nodes.push({ cluster: c, x: side === 'l' ? LEFT_X : RIGHT_X, y, side });
    y += c.size > 1 ? 560 + c.size * 14 : 500;
  });
  const H = y + 140;

  const pts = [
    { x: nodes[0].x, y: -80 },
    ...nodes.map((n) => ({ x: n.x, y: n.y })),
    { x: nodes[nodes.length - 1].x, y: H + 80 },
  ];
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const dy = pts[i].y - pts[i - 1].y;
    d += ` C ${pts[i - 1].x} ${pts[i - 1].y + dy * 0.5}, ${pts[i].x} ${pts[i].y - dy * 0.5}, ${pts[i].x} ${pts[i].y}`;
  }
  return { nodes, breaks, H, d };
}

/* one knot on the track: tight poster fan + caption block */
function ClusterNode({
  node,
  pw,
  onSelect,
}: {
  node: Node;
  pw: number;
  onSelect: (e: Entry) => void;
}) {
  const { cluster, x, y, side } = node;
  const items = cluster.items;
  const n = items.length;
  const step = pw * 0.62;
  const ph = pw * 1.5;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-26% 0px -26% 0px', once: true });
  const intensity = intensityFor(n);

  return (
    <>
      {/* anchor dot on the track */}
      <div
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${x / 10}%`, top: y }}
      >
        <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-blood bg-ink shadow-[0_0_14px_rgba(229,9,20,0.75)]">
          <span className="h-1 w-1 rounded-full bg-blood" />
        </span>
      </div>

      {/* caption block on the opposite side */}
      <div
        className="absolute w-[34%] min-w-[240px] max-w-[380px]"
        style={{
          top: y - ph - 44,
          ...(side === 'l' ? { left: '57%' } : { right: '57%', textAlign: 'left' }),
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: side === 'l' ? 24 : -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-2.5 font-tele text-[10px] tracking-[0.28em] text-fog">
            <span className="h-0.5 w-5 bg-blood" />
            {fmtMonth(cluster.startTs).toUpperCase()}
          </div>
          <h3 className="mt-3 text-[26px] font-semibold leading-[1.12] tracking-tight text-bone sm:text-[30px]">
            {headlineFor(n)}
          </h3>
          <div className="mt-3 font-tele text-[11px] tracking-[0.14em] text-dim">
            {n} {n === 1 ? 'story' : 'stories'} <span className="mx-1.5 text-line">·</span> {fmtDur(cluster.minutes)}
          </div>
          {intensity && (
            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex items-end gap-[3px]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="w-[3px]"
                    initial={{ height: 4 }}
                    whileInView={{ height: i < intensity.bars ? 6 + i * 2.5 : 4 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.07, type: 'spring', stiffness: 260, damping: 18 }}
                    style={{ background: i < intensity.bars ? '#e50914' : '#26262b' }}
                  />
                ))}
              </span>
              <span className="font-tele text-[9px] tracking-[0.24em] text-dim">{intensity.label}</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* the fan — posters knot up, then detonate open */}
      <div
        ref={ref}
        className="absolute"
        style={{ left: `${x / 10}%`, top: y - ph / 2 - 30, width: 2, height: 2, marginLeft: -1, marginTop: -1 }}
      >
        {/* density glow behind knots */}
        {n > 1 && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blood/10 blur-3xl"
            style={{ width: pw * (1.4 + n * 0.35), height: pw * 1.6 }}
          />
        )}
        {items.map((e, i) => {
          const k = i - (n - 1) / 2;
          return (
            <motion.div
              key={e.id}
              className="absolute"
              style={{ left: -pw / 2, top: -ph / 2, width: pw, height: ph, zIndex: i + 1 }}
              initial={{ x: 0, y: 14, rotate: 0, scale: 0.45, opacity: 0 }}
              animate={
                inView
                  ? { x: k * step, y: Math.abs(k) * Math.abs(k) * 3.2, rotate: k * 7.5, scale: 1, opacity: 1 }
                  : { x: 0, y: 14, rotate: 0, scale: 0.45, opacity: 0 }
              }
              transition={{ type: 'spring', stiffness: 170, damping: 19, delay: 0.09 * i }}
            >
              <ZoomPoster entry={e} onClick={onSelect} hoverScale={1.75} className="h-full w-full" posterClass="h-full w-full" />
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

export default function ClusterBurst({
  items,
  order,
  onSelect,
}: {
  items: Entry[];
  order: Order;
  onSelect: (e: Entry) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const clusters = useMemo(() => clusterize(items, order), [items, order]);
  const geo = useMemo(() => buildGeo(clusters), [clusters]);
  const pw = Math.max(92, Math.min(150, width * 0.13));

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.6'] });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 27, restDelta: 0.0004 });

  /* playhead riding the track */
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const lenRef = useRef(0);
  useEffect(() => {
    if (!pathRef.current || !dotRef.current) return;
    lenRef.current = pathRef.current.getTotalLength();
    const pt = pathRef.current.getPointAtLength(0);
    dotRef.current.style.left = `${pt.x / 10}%`;
    dotRef.current.style.top = `${pt.y}px`;
  }, [geo.d]);
  useMotionValueEvent(progress, 'change', (v) => {
    if (!pathRef.current || !dotRef.current || !lenRef.current) return;
    const pt = pathRef.current.getPointAtLength(Math.min(1, Math.max(0, v)) * lenRef.current);
    dotRef.current.style.left = `${pt.x / 10}%`;
    dotRef.current.style.top = `${pt.y}px`;
  });

  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* view header */}
      <div className="flex flex-wrap items-end justify-between gap-6 pb-10 pt-16">
        <div>
          <div className="font-tele text-[10px] tracking-[0.3em] text-blood">VIEW 01</div>
          <h2 className="mt-2 font-display text-6xl tracking-wide text-bone sm:text-7xl">
            Cluster <span className="text-dim">&</span> Burst
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-fog">
            {items.length} nights, one track. A lone poster means a quiet evening — a knot
            means a binge. Scroll through it: dense stretches blow open into a fan.
          </p>
        </div>
        <div className="space-y-1.5 pb-2 font-tele text-[9px] tracking-[0.22em] text-dim">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-fog" /> SINGLE — QUIET STRETCH
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blood shadow-[0_0_8px_rgba(229,9,20,0.9)]" /> KNOT — BINGE DENSITY
          </div>
        </div>
      </div>

      {/* the track */}
      <div ref={ref} className="relative" style={{ height: geo.H }}>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VB_W} ${geo.H}`}
          preserveAspectRatio="none"
          fill="none"
        >
          <path d={geo.d} stroke="#26262b" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          <motion.path
            ref={pathRef}
            d={geo.d}
            stroke="#e50914"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            style={{ pathLength: progress, filter: 'drop-shadow(0 0 6px rgba(229,9,20,0.55))' }}
          />
        </svg>

        {/* playhead */}
        <div ref={dotRef} className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: `${geo.nodes[0].x / 10}%`, top: 0 }}>
          <span className="relative flex h-4 w-4 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blood/50" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-ember shadow-[0_0_14px_rgba(255,43,56,0.95)]" />
          </span>
          <span className="flicker absolute left-5 top-1/2 -translate-y-1/2 font-tele text-[9px] tracking-[0.3em] text-ember">
            NOW
          </span>
        </div>

        {geo.breaks.map((b) => (
          <motion.div
            key={b.year}
            className={`absolute flex items-center gap-4 ${b.align === 'right' ? 'right-4 flex-row-reverse sm:right-8' : 'left-4 sm:left-8'}`}
            style={{ top: b.y }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="font-display text-7xl leading-none text-bone sm:text-8xl">{b.year}</span>
            <span className="flex items-center gap-3 font-tele text-[9px] tracking-[0.34em] text-dim">
              <span className="h-px w-10 bg-line" /> A NEW CHAPTER
            </span>
          </motion.div>
        ))}

        {geo.nodes.map((n, i) => (
          <ClusterNode key={i} node={n} pw={pw} onSelect={onSelect} />
        ))}

        {/* end card */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <div className="font-display text-5xl tracking-[0.2em] text-dim">FIN</div>
          <div className="mt-2 font-tele text-[9px] tracking-[0.3em] text-dim">
            {items.length} TITLES · TO BE CONTINUED
          </div>
        </div>
      </div>
    </div>
  );
}
