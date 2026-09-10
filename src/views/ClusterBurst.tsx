import { useMemo, useRef, useState, useEffect, type RefObject } from 'react';
import {
  motion, useScroll, useSpring, useTransform, type MotionValue,
} from 'framer-motion';
import { Zap } from 'lucide-react';
import { ZoomPoster } from '../components/Poster';
import {
  clusterize, fmtMonth, hash32, type Cluster, type Entry, type Order,
} from '../data/library';

/**
 * VIEW 01 — CLUSTER & BURST
 * The watch history as a single winding track. Entries are bucketed by
 * activity density: a lone poster drifts down the line in quiet stretches,
 * a binge week coils into a knot that detonates — posters fanning outward
 * like a firework — as the scroll carries you through it.
 */

interface GeoNode {
  cluster: Cluster;
  x: number;
  y: number;
  t0: number;   // normalized scroll position of this node on the path
}
interface Geo {
  nodes: GeoNode[];
  path: string;
  dimPath: string;
  height: number;
  posterW: number;
  spreadX: number;
  fanArc: number;
  win: number;  // scroll-proximity half-window (fraction of total progress)
}

function useWidth(ref: RefObject<HTMLElement | null>) {
  const [w, setW] = useState(1200);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function buildGeo(clusters: Cluster[], width: number): Geo {
  const s = Math.min(Math.max(width / 1150, 0.55), 1);
  const cx = width / 2;
  const A = Math.min(width * 0.27, 335) * Math.min(s + 0.25, 1);
  const L = 520 * s + 170;

  /* vertical stacking: dense clusters get more air */
  let y = 120 * s + 40;
  const pos = clusters.map((c, i) => {
    const gap = (175 + c.size * 26 + (hash32(c.id) % 70)) * s;
    y += gap;
    return { c, y, i };
  });
  const height = y + 320 * s;

  const pathX = (py: number) =>
    cx + A * Math.sin(py / L) + A * 0.3 * Math.sin(py / 173 + 2.2);

  const nodes: GeoNode[] = pos.map(({ c, y: py }) => ({
    cluster: c,
    x: pathX(py),
    y: py,
    t0: py / height,
  }));

  /* catmull-rom → bezier through sampled path points */
  const pts: [number, number][] = [];
  for (let py = 0; py <= height; py += Math.max(70, height / 220)) pts.push([pathX(py), py]);
  pts.push([pathX(height), height]);
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }

  return {
    nodes,
    path: d,
    dimPath: d,
    height,
    posterW: Math.round(96 * s),
    spreadX: Math.round(64 * s),
    fanArc: 6,
    /* detonation zone ≈ ±1000px of scroll travel, clamped */
    win: Math.min(0.03, Math.max(0.011, 1000 / height)),
  };
}

/* one poster in a fan — transforms ride on the shared spread MotionValue */
function FanItem({
  entry, i, mid, total, spread, posterW, spreadX, fanArc, onSelect,
}: {
  entry: Entry; i: number; mid: number; total: number; spread: MotionValue<number>;
  posterW: number; spreadX: number; fanArc: number; onSelect: (e: Entry) => void;
}) {
  const off = i - mid;
  const jitter = ((hash32(entry.id) % 10) - 5) * 0.3;
  const x = useTransform(spread, (v) => v * off * spreadX + (i % 2 ? 1.5 : -1.5));
  const y = useTransform(spread, (v) => v * (Math.abs(off) ** 1.25) * fanArc + jitter * (1 - v) * 2);
  const rotate = useTransform(spread, (v) => v * off * 7.5 + (1 - v) * ((i % 3) - 1) * 2.2);
  void total;
  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{
        x, y, rotate,
        marginLeft: -posterW / 2,
        marginTop: -(posterW * 0.75),
        width: posterW,
        zIndex: 20 - Math.abs(off),
      }}
    >
      <ZoomPoster entry={entry} onSelect={onSelect} />
    </motion.div>
  );
}

function ClusterNode({
  node, geo, progress, onSelect, monthLabel, monthX,
}: {
  node: GeoNode;
  geo: Geo;
  progress: MotionValue<number>;
  onSelect: (e: Entry) => void;
  monthLabel: string | null;
  monthX: number;
}) {
  const { cluster } = node;
  const raw = useTransform(progress, [node.t0 - geo.win, node.t0, node.t0 + geo.win], [0, 1, 0]);
  const spread = useSpring(raw, { stiffness: 120, damping: 16, mass: 0.72 });

  const dense = Math.min(1, cluster.size / 9);
  const glowOp = useTransform(spread, (v) => 0.12 + v * 0.5 * (0.35 + dense));
  const r = 42 + dense * 46;
  const chipOp = useTransform(spread, [0, 0.35], [1, 0]);
  const stampOp = useTransform(spread, [0.55, 0.85], [0, 1]);
  const stampScale = useTransform(spread, [0.55, 1], [0.7, 1]);

  const items = cluster.items.slice(0, 10);
  const mid = (items.length - 1) / 2;

  return (
    <div className="absolute" style={{ left: node.x, top: node.y }}>
      {/* anchor dot on the track */}
      <div className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-blood/70 shadow-[0_0_8px_rgba(229,9,20,0.7)]" />

      {/* density furnace */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blood blur-2xl"
        style={{ width: r * 2, height: r * 2, opacity: glowOp }}
      />

      {/* month marker — only on sparse knots, raised above the fan's reach */}
      {monthLabel && (
        <div
          className="pointer-events-none absolute flex items-center gap-2 font-tele text-[10px] tracking-[0.3em] text-dim"
          style={{
            top: -(geo.posterW * 1.02),
            left: monthX > 0 ? 30 : undefined,
            right: monthX <= 0 ? 30 : undefined,
          }}
        >
          <span className="inline-block h-px w-6 bg-blood/50" />
          {monthLabel}
        </div>
      )}

      {/* binge stamp rides in with the detonation */}
      {cluster.binge && (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-0 z-40 -translate-x-1/2 whitespace-nowrap"
          style={{ opacity: stampOp, scale: stampScale, y: -(geo.posterW * 0.95) }}
        >
          <div className="flex -rotate-2 items-center gap-2 border border-blood/70 bg-ink/90 px-2.5 py-1 font-tele text-[9.5px] tracking-[0.22em] text-ember shadow-[0_0_20px_rgba(229,9,20,0.35)]">
            <Zap size={11} strokeWidth={2.5} />
            BINGE · {cluster.size} TITLES / {cluster.spanDays} {cluster.spanDays === 1 ? 'DAY' : 'DAYS'}
          </div>
        </motion.div>
      )}

      {/* collapsed size chip */}
      {cluster.size > 1 && (
        <motion.div
          className="pointer-events-none absolute z-40 font-tele text-[9px] tracking-[0.14em]"
          style={{ opacity: chipOp, left: geo.posterW * 0.42, top: geo.posterW * 0.18 }}
        >
          <span className="rounded-sm border border-blood/60 bg-ink/95 px-1.5 py-0.5 text-blood">
            ×{cluster.size}
          </span>
        </motion.div>
      )}

      {items.map((e, i) => (
        <FanItem
          key={e.id}
          entry={e}
          i={i}
          mid={mid}
          total={items.length}
          spread={spread}
          posterW={geo.posterW}
          spreadX={geo.spreadX}
          fanArc={geo.fanArc}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default function ClusterBurst({
  items, order, onSelect,
}: {
  items: Entry[]; order: Order; onSelect: (e: Entry) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const clusters = useMemo(() => clusterize(items, order), [items, order]);
  const geo = useMemo(() => buildGeo(clusters, width), [clusters, width]);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.86', 'end 0.62'],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 27, restDelta: 0.0004 });

  const playDist = useTransform(progress, (v) => `${Math.min(100, Math.max(0, v * 100))}%`);
  const offsetOk = useMemo(
    () => typeof CSS !== 'undefined' && CSS.supports?.('offset-path', 'path("M 0 0 L 10 10")'),
    [],
  );

  const monthMarks = useMemo(() => {
    let last = '';
    return geo.nodes.map((n) => {
      const m = fmtMonth(n.cluster.startTs);
      const show = m !== last ? m : null;
      last = m;
      return show;
    });
  }, [geo]);

  return (
    <section className="relative border-t border-line">
      <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-14 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-tele text-[10px] tracking-[0.4em] text-blood">VIEW 01</div>
            <h2 className="mt-1 font-display text-4xl uppercase tracking-wide text-bone sm:text-6xl">
              Cluster <span className="text-outline-red">&amp;</span> Burst
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-fog">
              {items.length} nights, one track. A lone poster means a quiet evening —
              a knot means a binge. Scroll through it: dense stretches blow open.
            </p>
          </div>
          <div className="font-tele text-[10px] leading-relaxed tracking-[0.18em] text-dim">
            <div>● SINGLE — QUIET STRETCH</div>
            <div className="mt-1 text-blood">● KNOT — BINGE DENSITY</div>
          </div>
        </div>
      </div>

      <div ref={ref} className="relative mx-auto w-full max-w-[1500px]" style={{ height: geo.height }}>
        {/* the track: dim full line + red line that draws itself in */}
        <svg
          className="pointer-events-none absolute inset-0"
          width={width} height={geo.height} viewBox={`0 0 ${width} ${geo.height}`}
        >
          <path d={geo.dimPath} fill="none" stroke="#2a1215" strokeWidth="2" />
          <motion.path
            d={geo.path}
            fill="none"
            stroke="#e50914"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ pathLength: progress, filter: 'drop-shadow(0 0 6px rgba(229,9,20,0.55))' }}
          />
        </svg>

        {geo.nodes.map((n, i) => (
          <ClusterNode
            key={n.cluster.id}
            node={n}
            geo={geo}
            progress={progress}
            onSelect={onSelect}
            monthLabel={n.cluster.size <= 4 ? monthMarks[i] : null}
            monthX={n.x - width / 2}
          />
        ))}

        {/* a playhead that rides the track — you are here */}
        {offsetOk && (
          <motion.div
            className="pointer-events-none absolute left-0 top-0 z-30"
            style={{
              offsetPath: `path("${geo.dimPath}")`,
              offsetDistance: playDist,
              offsetRotate: '0deg',
            } as unknown as React.CSSProperties}
          >
            <div className="relative -left-[7px] -top-[7px] h-3.5 w-3.5">
              <div className="absolute inset-0 rounded-full bg-blood shadow-[0_0_16px_rgba(229,9,20,0.95)]" />
              <div className="absolute inset-0 animate-ping rounded-full bg-blood/50" />
            </div>
            <div className="absolute left-2.5 top-[-3px] font-tele text-[8px] tracking-[0.34em] text-blood">NOW</div>
          </motion.div>
        )}

        {/* end card */}
        <div
          className="absolute left-1/2 -translate-x-1/2 text-center"
          style={{ top: geo.height - 200 }}
        >
          <div className="font-display text-2xl tracking-[0.2em] text-bone">FIN</div>
          <div className="mt-2 font-tele text-[9px] tracking-[0.3em] text-dim">
            {items.length} TITLES · TO BE CONTINUED
          </div>
        </div>
      </div>
    </section>
  );
}
