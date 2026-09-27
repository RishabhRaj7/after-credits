import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Almanac } from '../data/almanac';
import { fmtDate, type Entry } from '../data/library';

const EASE = [0.16, 1, 0.3, 1] as const;
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ── time travel: premiere year against log date ───────────────────────────
   Every title is a dot. The dashed diagonal is "started the moment it came
   out" — the further below it, the further back the log reached. */

const W = 800;
const H = 330;
const PAD = { l: 44, r: 12, t: 12, b: 26 };

export function TimeTravel({ points, onOpen }: { points: Almanac['timeTravel']; onOpen: (e: Entry) => void }) {
  const [hover, setHover] = useState<(typeof points)[number] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { x, y, xTicks, yTicks, diag } = useMemo(() => {
    const t0 = Math.min(...points.map((p) => p.logTs));
    const t1 = Math.max(...points.map((p) => p.logTs));
    const y0 = Math.floor(Math.min(...points.map((p) => p.release)) / 10) * 10;
    const y1 = Math.ceil(Math.max(...points.map((p) => p.release)) + 0.5);
    const x = (ts: number) => PAD.l + ((ts - t0) / (t1 - t0 || 1)) * (W - PAD.l - PAD.r);
    const y = (yr: number) => H - PAD.b - ((yr - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b);
    const firstYear = new Date(t0).getFullYear() + 1;
    const lastYear = new Date(t1).getFullYear();
    const xTicks = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i).map((yr) => ({
      yr,
      px: x(new Date(yr, 0, 1).getTime()),
    }));
    const yTicks: number[] = [];
    for (let v = y0; v <= y1; v += 10) yTicks.push(v);
    const yearAt = (ts: number) => new Date(ts).getFullYear() + new Date(ts).getMonth() / 12;
    const diag = { x1: x(t0), y1: y(yearAt(t0)), x2: x(t1), y2: y(yearAt(t1)) };
    return { x, y, xTicks, yTicks, diag };
  }, [points]);

  const onMove = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * W;
    const my = ((e.clientY - r.top) / r.height) * H;
    let best: (typeof points)[number] | null = null;
    let bd = 22 * 22;
    for (const p of points) {
      const d = (x(p.logTs) - mx) ** 2 + (y(p.release) - my) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    setHover(best);
  };

  return (
    <div className="mt-auto pt-4">
      <div className="label mb-2 h-4 truncate normal-case tracking-[0.06em] text-fog">
        {hover ? (
          <>
            <span className="text-bone">{hover.entry.title}</span> · premiered {fmtDate(hover.entry.releaseDate)} · started {fmtDate(hover.entry.addedAt)}
          </>
        ) : (
          'Hover a dot · click to open'
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full cursor-crosshair"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onClick={() => hover && onOpen(hover.entry)}
        role="img"
        aria-label="Premiere year of each title plotted against the date I started it"
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#1c1c21" />
            <text x={PAD.l - 8} y={y(v)} textAnchor="end" dominantBaseline="central" className="font-tele" style={{ fontSize: 10, fill: 'var(--color-dim)' }}>
              {v}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t.yr} x={t.px} y={H - 8} textAnchor="middle" className="font-tele" style={{ fontSize: 10, fill: 'var(--color-dim)' }}>
            '{String(t.yr).slice(2)}
          </text>
        ))}
        <motion.line
          {...diag}
          stroke="var(--color-fog)"
          strokeWidth={1}
          strokeDasharray="4 5"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: EASE }}
        />
        <text x={diag.x2 - 4} y={diag.y2 + 14} textAnchor="end" className="font-tele" style={{ fontSize: 10, fill: 'var(--color-fog)' }}>
          started on release day
        </text>
        <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }}>
          {points.map((p) => (
            <circle
              key={p.entry.id}
              cx={x(p.logTs)}
              cy={y(p.release)}
              r={3.2}
              fill={p.entry.type === 'movie' ? 'var(--color-bone)' : 'var(--color-blood)'}
              fillOpacity={0.7}
            />
          ))}
        </motion.g>
        {hover && (
          <circle
            cx={x(hover.logTs)}
            cy={y(hover.release)}
            r={6.5}
            fill={hover.entry.type === 'movie' ? 'var(--color-bone)' : 'var(--color-blood)'}
            stroke="var(--color-ink)"
            strokeWidth={2}
          />
        )}
      </svg>
      <div className="mt-2 flex gap-5">
        <span className="label flex items-center gap-2 text-[9px] text-fog">
          <span className="h-2 w-2 rounded-full bg-bone" /> Film
        </span>
        <span className="label flex items-center gap-2 text-[9px] text-fog">
          <span className="h-2 w-2 rounded-full bg-blood" /> Series
        </span>
      </div>
    </div>
  );
}

/* ── rhythm: titles per month, one row per year ────────────────────────── */

export function Heatmap({ data }: { data: Almanac['heatmap'] }) {
  const [hover, setHover] = useState<{ y: number; m: number; n: number } | null>(null);
  return (
    <div className="mt-auto pt-4">
      <div className="label mb-3 h-4 truncate normal-case tracking-[0.06em] text-fog">
        {hover ? `${MONTH_NAMES[hover.m]} ${hover.y} — ${hover.n} ${hover.n === 1 ? 'title' : 'titles'}` : 'Backlog days left out'}
      </div>
      <div className="grid grid-cols-[34px_repeat(12,minmax(0,1fr))] gap-[3px]" onMouseLeave={() => setHover(null)}>
        <span />
        {MONTHS.map((m, i) => (
          <span key={i} className="text-center font-tele text-[9px] text-dim">
            {m}
          </span>
        ))}
        {data.years.map((yr, yi) => (
          <Row key={yr} yr={yr} row={data.cells[yi]} max={data.max} yi={yi} onHover={setHover} />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="font-tele text-[9px] text-dim">0</span>
        {[0.15, 0.35, 0.55, 0.75, 1].map((t) => (
          <span key={t} className="h-2 w-5" style={{ background: 'var(--color-blood)', opacity: t }} />
        ))}
        <span className="font-tele text-[9px] text-dim">{data.max}</span>
      </div>
    </div>
  );
}

function Row({ yr, row, max, yi, onHover }: { yr: number; row: number[]; max: number; yi: number; onHover: (h: { y: number; m: number; n: number }) => void }) {
  return (
    <>
      <span className="self-center font-tele text-[9px] text-dim">'{String(yr).slice(2)}</span>
      {row.map((n, m) => (
        <motion.span
          key={m}
          onMouseEnter={() => onHover({ y: yr, m, n })}
          className={`h-[18px] ${n ? '' : 'bg-smoke'}`}
          style={n ? { background: 'var(--color-blood)' } : undefined}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: n ? 0.15 + 0.85 * Math.pow(n / max, 0.6) : 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: (yi + m) * 0.02 }}
        />
      ))}
    </>
  );
}

/* ── genre drift: each top genre's share of the year, as a sparkline ───── */

export function Drift({ drift }: { drift: Almanac['drift'] }) {
  const SW = 180;
  const SH = 34;
  const top = Math.max(0.01, ...drift.flatMap((g) => g.shares.map((s) => s.share)));
  const yOf = (v: number) => SH - (v / top) * SH;
  const years = drift[0]?.shares.map((s) => s.year) ?? [];
  return (
    <div className="mt-auto space-y-4 pt-5">
      {drift.map((g, gi) => {
        const n = g.shares.length;
        const pts = g.shares.map((s, i) => [(i / Math.max(1, n - 1)) * SW, yOf(s.share)] as const);
        const peak = g.shares.reduce((a, b) => (b.share > a.share ? b : a), g.shares[0]);
        const colour = gi === 0 ? 'var(--color-blood)' : 'var(--color-bone)';
        return (
          <div key={g.name} className="grid grid-cols-[88px_1fr_44px] items-center gap-3">
            <span className="truncate text-sm font-medium text-bone">{g.name}</span>
            <svg viewBox={`-4 -4 ${SW + 8} ${SH + 8}`} className="h-10 w-full overflow-visible" aria-label={`${g.name} peaked at ${Math.round(peak.share * 100)}% in ${peak.year}`}>
              <line x1={0} x2={SW} y1={yOf(g.overall)} y2={yOf(g.overall)} stroke="#34343c" strokeDasharray="2 3" />
              <motion.polyline
                points={pts.map((p) => p.join(',')).join(' ')}
                fill="none"
                stroke={colour}
                strokeWidth={1.5}
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: gi * 0.1, ease: EASE }}
              />
              {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={g.shares[i].year === peak.year ? 2.6 : 1.2} fill={colour}>
                  <title>{`${g.shares[i].year}: ${Math.round(g.shares[i].share * 100)}%`}</title>
                </circle>
              ))}
            </svg>
            <span className="text-right font-tele text-[10px] tabular-nums text-fog" title={`Peak ${Math.round(peak.share * 100)}% in ${peak.year}`}>
              {Math.round(g.overall * 100)}%
            </span>
          </div>
        );
      })}
      {years.length > 1 && (
        <div className="grid grid-cols-[88px_1fr_44px] gap-3">
          <span />
          <span className="flex justify-between font-tele text-[9px] text-dim">
            <span>{years[0]}</span>
            <span>{years[years.length - 1]}</span>
          </span>
          <span />
        </div>
      )}
      <p className="label pt-1 normal-case tracking-[0.04em] text-dim">
        Share of each year's titles carrying the genre · large dot = peak year · dashed = all-time share
      </p>
    </div>
  );
}
