import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import type { GenreCount } from '../data/library';

const MIN_N = 5;
const MAX_N = 12;
const SIZE = 600;
const C = SIZE / 2;
const INNER = 100;
const MAXR = 258;
const HOVER_BOOST = 14;

/* single-hue red ramp: dim desaturated maroon → blood → hot ember.
   high-count genres land bright, low-count genres sit muted. */
function rampColor(t: number): string {
  const lo = [56, 16, 22];
  const mid = [229, 9, 20];
  const hi = [255, 84, 94];
  const lerp = (a: number[], b: number[], u: number) =>
    a.map((v, i) => Math.round(v + (b[i] - v) * u));
  const c = t < 0.5 ? lerp(lo, mid, t * 2) : lerp(mid, hi, (t - 0.5) * 2);
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function sectorPath(a0: number, a1: number, r0: number, r1: number): string {
  const px = (a: number, r: number) => (C + Math.cos(a) * r).toFixed(2);
  const py = (a: number, r: number) => (C + Math.sin(a) * r).toFixed(2);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${px(a0, r1)} ${py(a0, r1)}`,
    `A ${r1.toFixed(2)} ${r1.toFixed(2)} 0 ${large} 1 ${px(a1, r1)} ${py(a1, r1)}`,
    `L ${px(a1, r0)} ${py(a1, r0)}`,
    `A ${r0.toFixed(2)} ${r0.toFixed(2)} 0 ${large} 0 ${px(a0, r0)} ${py(a0, r0)}`,
    'Z',
  ].join(' ');
}

interface Spoke extends GenreCount {
  center: number;
  a0: number;
  a1: number;
  len: number;
  t: number;
  rank: number;
}

const spring = { type: 'spring' as const, stiffness: 110, damping: 19 };

export default function GenreRadar({
  genres,
  totalTitles,
  totalGenres,
}: {
  genres: GenreCount[];
  totalTitles: number;
  totalGenres: number;
}) {
  const [topN, setTopN] = useState(8);
  const [hovered, setHovered] = useState<string | null>(null);

  const spokes = useMemo<Spoke[]>(() => {
    const visible = genres.slice(0, topN);
    const max = visible[0]?.count ?? 1;
    const slot = (Math.PI * 2) / visible.length;
    return visible.map((g, i) => {
      const center = -Math.PI / 2 + i * slot;
      const half = slot * 0.3;
      return {
        ...g,
        center,
        a0: center - half,
        a1: center + half,
        len: INNER + (MAXR - INNER) * (g.count / max),
        t: visible.length > 1 ? 1 - i / (visible.length - 1) : 1,
        rank: i,
      };
    });
  }, [genres, topN]);

  const hoveredSpoke = spokes.find((s) => s.name === hovered) ?? null;

  return (
    <div className="relative flex w-full max-w-[560px] flex-col">
      {/* the chart — floats directly over the hero, no panel */}
      <div className="relative mx-auto w-full max-w-[500px]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block w-full">
          {/* concentric guides */}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <circle
              key={f}
              cx={C}
              cy={C}
              r={INNER + (MAXR - INNER) * f}
              fill="none"
              stroke="rgba(236,231,223,0.06)"
              strokeDasharray="2 6"
            />
          ))}
          <circle cx={C} cy={C} r={INNER} fill="rgba(10,10,12,0.58)" stroke="rgba(229,9,20,0.4)" />
          <circle cx={C} cy={C} r={INNER - 7} fill="none" stroke="rgba(38,38,43,0.7)" />

          {/* spokes (absolute coords) + radiating labels (rotated frame) */}
          <AnimatePresence initial={false}>
            {spokes.map((s, i) => {
              const isHover = hovered === s.name;
              const dimmed = hovered !== null && !isHover;
              const outer = isHover ? s.len + HOVER_BOOST : s.len;
              return (
                <motion.path
                  key={s.name}
                  initial={{ d: sectorPath(s.a0, s.a1, INNER, INNER + 0.6), opacity: 0 }}
                  animate={{
                    d: sectorPath(s.a0, s.a1, INNER, outer),
                    fill: rampColor(s.t),
                    opacity: dimmed ? 0.32 : 1,
                  }}
                  exit={{ d: sectorPath(s.a0, s.a1, INNER, INNER + 0.6), opacity: 0 }}
                  transition={{ ...spring, fill: { duration: 0.35 }, delay: i * 0.028 }}
                  onMouseEnter={() => setHovered(s.name)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    cursor: 'crosshair',
                    filter: isHover ? `drop-shadow(0 0 10px ${rampColor(s.t)})` : undefined,
                  }}
                />
              );
            })}
          </AnimatePresence>
        </svg>

        {/* center readout — the interactive hole */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative flex h-[30%] w-[30%] items-center justify-center">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={hoveredSpoke ? hoveredSpoke.name : '__total__'}
                initial={{ opacity: 0, scale: 0.82, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.08, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center"
              >
                {hoveredSpoke ? (
                  <>
                    <span className="font-display text-[clamp(32px,5.4vw,56px)] leading-none text-ember [text-shadow:0_0_24px_rgba(229,9,20,0.55)]">
                      {hoveredSpoke.count}
                    </span>
                    <span className="mt-1 max-w-[92%] truncate font-tele text-[8.5px] tracking-[0.22em] text-bone">
                      {hoveredSpoke.name.toUpperCase()}
                    </span>
                    <span className="mt-0.5 font-tele text-[7.5px] tracking-[0.2em] text-dim">
                      RANK #{hoveredSpoke.rank + 1}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-display text-[clamp(32px,5.4vw,56px)] leading-none text-bone">
                      {totalTitles}
                    </span>
                    <span className="mt-1 font-tele text-[8px] tracking-[0.2em] text-fog">
                      TITLES
                    </span>
                    <span className="mt-0.5 font-tele text-[7.5px] tracking-[0.18em] text-dim">
                      {totalGenres} GENRES TRACKED
                    </span>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* top-N aperture control */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-2">
        <div className="min-w-[132px]">
          <div className="font-tele text-[9px] tracking-[0.3em] text-dim">APERTURE</div>
          <div className="font-display text-2xl uppercase leading-none tracking-wide text-bone">
            Top <span className="text-blood">{topN}</span> Genres
          </div>
        </div>
        <div className="min-w-[140px] flex-1">
          <input
            type="range"
            min={MIN_N}
            max={MAX_N}
            step={1}
            value={topN}
            aria-label="Number of genre spokes"
            onChange={(e) => setTopN(Number(e.target.value))}
            className="genre-range w-full"
          />
          <div className="mt-1.5 flex justify-between px-[3px]">
            {Array.from({ length: MAX_N - MIN_N + 1 }, (_, i) => MIN_N + i).map((n) => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                aria-label={`Show top ${n} genres`}
                className={`h-1.5 w-1.5 cursor-pointer rotate-45 transition-all duration-200 ${
                  n === topN ? 'scale-125 bg-blood shadow-[0_0_8px_rgba(229,9,20,0.9)]' : n < topN ? 'bg-dim' : 'bg-line hover:bg-fog'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTopN((n) => Math.max(MIN_N, n - 1))}
            disabled={topN <= MIN_N}
            aria-label="Fewer genres"
            className="flex h-8 w-8 cursor-pointer items-center justify-center border border-line text-fog transition-colors hover:border-blood/70 hover:text-bone disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Minus size={14} strokeWidth={2.4} />
          </button>
          <button
            onClick={() => setTopN((n) => Math.min(MAX_N, n + 1))}
            disabled={topN >= MAX_N}
            aria-label="More genres"
            className="flex h-8 w-8 cursor-pointer items-center justify-center border border-line text-fog transition-colors hover:border-blood/70 hover:text-bone disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Plus size={14} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
