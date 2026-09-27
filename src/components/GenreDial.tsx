import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { fmtInt, type GenreStat } from '../data/library';

/* Radial bar chart of the library by genre, three measures on one dial:
     wedge length  → titles in the genre (the rings are its axis)
     wedge colour  → hours watched (stepped sequential ramp, legend below)
     dot on spoke  → how many of those titles are films, same axis as length */

const MIN_N = 6;
const MAX_N = 14;
const SIZE = 960;
const C = SIZE / 2;
const R0 = 104; // the hole
const RAX = 334; // radius of the top axis value
const RLABEL = 380;

/* one warm hue, dim → hot; every step reads against the ink surface */
const RAMP = ['#3a2530', '#5e2d3c', '#8c3444', '#c23d3f', '#f2543c', '#ff9a78'];

const polar = (a: number, r: number) => [C + Math.cos(a) * r, C + Math.sin(a) * r] as const;

function sector(a0: number, a1: number, r0: number, r1: number): string {
  const [x0, y0] = polar(a0, r1);
  const [x1, y1] = polar(a1, r1);
  const [x2, y2] = polar(a1, r0);
  const [x3, y3] = polar(a0, r0);
  const f = (n: number) => n.toFixed(2);
  return `M ${f(x0)} ${f(y0)} A ${r1} ${r1} 0 0 1 ${f(x1)} ${f(y1)} L ${f(x2)} ${f(y2)} A ${r0} ${r0} 0 0 0 ${f(x3)} ${f(y3)} Z`;
}

function niceStep(max: number): number {
  for (const s of [10, 20, 25, 50, 100, 200, 250, 500, 1000]) if (max / s <= 4) return s;
  return 2000;
}

/* labels break on words into lines of ~11 characters */
function wrap(name: string): string[] {
  const out: string[] = [];
  for (const w of name.split(' ')) {
    const last = out[out.length - 1];
    if (last && (last + ' ' + w).length <= 11) out[out.length - 1] = `${last} ${w}`;
    else out.push(w);
  }
  return out;
}

const spring = { type: 'spring' as const, stiffness: 110, damping: 20 };

export default function GenreDial({ genres, totalTitles }: { genres: GenreStat[]; totalTitles: number }) {
  const [topN, setTopN] = useState(10);
  const [active, setActive] = useState<string | null>(null);
  const n = Math.min(topN, genres.length);

  const { spokes, ticks, scaleMax, bins } = useMemo(() => {
    const visible = genres.slice(0, n);
    const step = niceStep(visible[0]?.count ?? 1);
    const scaleMax = Math.ceil((visible[0]?.count ?? 1) / step) * step;
    const ticks = Array.from({ length: scaleMax / step }, (_, i) => (i + 1) * step);
    const maxH = Math.max(...visible.map((g) => g.minutes / 60), 1);
    const binW = Math.ceil(maxH / RAMP.length / 50) * 50 || 50;
    const bins = RAMP.map((c, i) => ({ color: c, from: i * binW, to: (i + 1) * binW }));
    const slot = (Math.PI * 2) / Math.max(visible.length, 1);
    const spokes = visible.map((g, i) => {
      const angle = -Math.PI / 2 + (i + 0.5) * slot;
      const hours = g.minutes / 60;
      return {
        ...g,
        rank: i,
        angle,
        a0: angle - slot * 0.4,
        a1: angle + slot * 0.4,
        hours,
        color: RAMP[Math.min(RAMP.length - 1, Math.floor(hours / binW))],
      };
    });
    return { spokes, ticks, scaleMax, bins };
  }, [genres, n]);

  const r = (v: number) => R0 + (v / scaleMax) * (RAX - R0);
  const hovered = spokes.find((s) => s.name === active) ?? null;
  const lead = spokes[0];

  return (
    <figure className="relative mx-auto w-full max-w-[640px]" aria-label="Titles, films and hours by genre">
      <div className="relative">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block w-full overflow-visible">
          {/* axis rings + values, set in the gap at twelve o'clock */}
          {ticks.map((t) => (
            <g key={t}>
              <circle cx={C} cy={C} r={r(t)} fill="none" stroke="#26262c" strokeWidth={1.5} />
              <text x={C} y={C - r(t) + 6} textAnchor="middle" className="font-tele" style={{ fontSize: 16, fill: 'var(--color-dim)' }}>
                {t}
              </text>
            </g>
          ))}

          <AnimatePresence initial={true}>
            {spokes.map((s, i) => {
              const isOn = active === s.name;
              const dim = active !== null && !isOn;
              const len = r(s.count);
              const [sx1, sy1] = polar(s.angle, R0);
              const [sx2, sy2] = polar(s.angle, RAX + 26);
              const [dx, dy] = polar(s.angle, r(s.films));
              const [lx, ly] = polar(s.angle, RLABEL);
              const cos = Math.cos(s.angle);
              const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
              const lines = wrap(s.name);
              const sin = Math.sin(s.angle);
              const lyTop = ly - ((lines.length - 1) * 26) / 2 + (sin > 0.5 ? 12 : sin < -0.5 ? -12 : 0);
              return (
                <motion.g
                  key={s.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: dim ? 0.3 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  tabIndex={0}
                  role="img"
                  aria-label={`${s.name}: ${s.count} titles, ${s.films} films, ${fmtInt(s.hours)} hours`}
                  onMouseEnter={() => setActive(s.name)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(s.name)}
                  onBlur={() => setActive(null)}
                  style={{ cursor: 'crosshair', outline: 'none' }}
                >
                  <motion.path
                    initial={{ d: sector(s.a0, s.a1, R0, R0 + 1) }}
                    animate={{ d: sector(s.a0, s.a1, R0, len + (isOn ? 10 : 0)) }}
                    exit={{ d: sector(s.a0, s.a1, R0, R0 + 1) }}
                    transition={{ ...spring, delay: 0.35 + i * 0.05 }}
                    fill={s.color}
                  />
                  <motion.line
                    x1={sx1}
                    y1={sy1}
                    x2={sx2}
                    y2={sy2}
                    stroke="var(--color-bone)"
                    strokeOpacity={0.7}
                    strokeWidth={2}
                    strokeDasharray="7 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, delay: 0.6 + i * 0.05 }}
                  />
                  <motion.circle
                    cx={dx}
                    cy={dy}
                    r={9}
                    fill="var(--color-bone)"
                    stroke="var(--color-ink)"
                    strokeWidth={3}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...spring, delay: 0.9 + i * 0.05 }}
                  />
                  <text
                    x={lx}
                    y={lyTop}
                    textAnchor={anchor}
                    dominantBaseline="central"
                    className="text-[29px] sm:text-[22px]"
                    style={{ fill: isOn ? 'var(--color-bone)' : 'var(--color-fog)', fontWeight: 500 }}
                  >
                    {lines.map((l, k) => (
                      <tspan key={k} x={lx} dy={k ? 26 : 0}>
                        {l}
                      </tspan>
                    ))}
                  </text>
                </motion.g>
              );
            })}
          </AnimatePresence>

          {/* in-chart key on the leading wedge, like a map annotation */}
          {lead && active === null && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} style={{ pointerEvents: 'none' }}>
              <path id="dial-lead-arc" d={`M ${polar(lead.a0, r(lead.count) + 12).join(' ')} A ${r(lead.count) + 12} ${r(lead.count) + 12} 0 0 1 ${polar(lead.a1, r(lead.count) + 12).join(' ')}`} fill="none" />
              <text className="font-tele" style={{ fontSize: 14, letterSpacing: '0.14em', fill: 'var(--color-fog)' }}>
                <textPath href="#dial-lead-arc" startOffset="50%" textAnchor="middle">
                  TITLES
                </textPath>
              </text>
              <text
                transform={`translate(${polar(lead.angle, r(lead.films) - 30).join(' ')}) rotate(${(lead.angle * 180) / Math.PI + 90})`}
                textAnchor="middle"
                className="font-tele"
                style={{ fontSize: 14, letterSpacing: '0.14em', fill: 'var(--color-fog)' }}
              >
                FILMS
              </text>
            </motion.g>
          )}
        </svg>

        {/* centre readout */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={hovered?.name ?? '__all__'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="flex w-[24%] flex-col items-center text-center"
            >
              <span className="font-display text-[clamp(28px,4.2vw,50px)] font-bold leading-none text-bone">
                {hovered ? hovered.count : totalTitles}
              </span>
              <span className="label mt-1.5 max-w-full truncate text-[8.5px] text-fog">{hovered ? hovered.name : 'Titles'}</span>
              <span className="label mt-1 text-[8px] leading-relaxed text-dim">
                {hovered ? (
                  <>
                    {hovered.films} films · {hovered.series} series
                    <br />
                    {fmtInt(hovered.hours)} hours
                  </>
                ) : (
                  `${genres.length} genres`
                )}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* legend: stepped ramp for colour, key for the other two encodings */}
      <figcaption className="mt-4 flex flex-col items-center gap-4">
        <div className="w-full max-w-[380px]">
          <div className="label mb-2 text-center text-[9px] text-fog">Hours watched</div>
          <div className="flex h-2.5 gap-[2px]">
            {bins.map((b) => (
              <span key={b.color} className="flex-1" style={{ background: b.color }} />
            ))}
          </div>
          <div className="mt-1.5 flex">
            {bins.slice(0, -1).map((b) => (
              <span key={b.to} className="flex-1 text-right font-tele text-[9px] tabular-nums text-dim" style={{ transform: 'translateX(50%)' }}>
                {fmtInt(b.to)}
              </span>
            ))}
            <span className="flex-1" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <span className="label flex items-center gap-2 text-[9px] text-fog">
            <span className="h-2.5 w-4 bg-rule" /> Length · titles
          </span>
          <span className="label flex items-center gap-2 text-[9px] text-fog">
            <span className="h-2 w-2 rounded-full bg-bone" /> Films
          </span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTopN((v) => Math.max(MIN_N, v - 1))}
              disabled={n <= MIN_N}
              aria-label="Fewer genres"
              className="grid h-6 w-6 cursor-pointer place-items-center border border-line text-fog transition-colors hover:border-rule hover:text-bone disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Minus size={11} />
            </button>
            <span className="label w-14 text-center text-[9px] text-bone" aria-live="polite">
              Top {n}
            </span>
            <button
              type="button"
              onClick={() => setTopN((v) => Math.min(MAX_N, genres.length, v + 1))}
              disabled={n >= Math.min(MAX_N, genres.length)}
              aria-label="More genres"
              className="grid h-6 w-6 cursor-pointer place-items-center border border-line text-fog transition-colors hover:border-rule hover:text-bone disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus size={11} />
            </button>
          </span>
        </div>
      </figcaption>
    </figure>
  );
}
