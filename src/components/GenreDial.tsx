import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import type { GenreCount } from '../data/library';

/* Radial bar chart of the library by genre. One spoke per genre, length ∝
   titles; every spoke carries its own label so nothing hides behind hover. */

const MIN_N = 6;
const MAX_N = 14;
const SIZE = 720;
const C = SIZE / 2;
const R0 = 96;
const RMAX = 222;
const TICKS = 120;

const polar = (a: number, r: number) => [C + Math.cos(a) * r, C + Math.sin(a) * r] as const;
const spring = { type: 'spring' as const, stiffness: 120, damping: 20 };

export default function GenreDial({ genres, totalTitles }: { genres: GenreCount[]; totalTitles: number }) {
  const [topN, setTopN] = useState(10);
  const [active, setActive] = useState<string | null>(null);
  const n = Math.min(topN, genres.length);

  const spokes = useMemo(() => {
    const visible = genres.slice(0, n);
    const max = visible[0]?.count ?? 1;
    return visible.map((g, i) => {
      const angle = -Math.PI / 2 + (i / visible.length) * Math.PI * 2;
      return { ...g, angle, len: 10 + (RMAX - R0 - 10) * (g.count / max), rank: i };
    });
  }, [genres, n]);

  const hovered = spokes.find((s) => s.name === active) ?? null;

  return (
    <figure className="relative mx-auto w-full max-w-[540px]" aria-label="Titles by genre">
      <div className="relative">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block w-full overflow-visible" role="presentation">
          {/* instrument ring */}
          {Array.from({ length: TICKS }, (_, i) => {
            const a = (i / TICKS) * Math.PI * 2;
            const major = i % 10 === 0;
            const [x1, y1] = polar(a, RMAX + 30);
            const [x2, y2] = polar(a, RMAX + (major ? 40 : 34));
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? '#4a4a52' : '#26262c'} strokeWidth={1} />;
          })}
          {[0.5, 1].map((f) => (
            <circle key={f} cx={C} cy={C} r={R0 + (RMAX - R0) * f} fill="none" stroke="#1d1d22" strokeDasharray="1 5" />
          ))}
          <circle cx={C} cy={C} r={R0 - 12} fill="none" stroke="#24242a" />

          <AnimatePresence initial={true}>
            {spokes.map((s, i) => {
              const isOn = active === s.name;
              const dim = active !== null && !isOn;
              const [x1, y1] = polar(s.angle, R0);
              const [x2, y2] = polar(s.angle, R0 + s.len);
              const [lx, ly] = polar(s.angle, R0 + s.len + 16);
              const deg = (s.angle * 180) / Math.PI;
              const flip = deg > 90 && deg < 270;
              const stroke = isOn || (active === null && i === 0) ? 'var(--color-blood)' : 'var(--color-bone)';
              return (
                <motion.g
                  key={s.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: dim ? 0.28 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  tabIndex={0}
                  role="img"
                  aria-label={`${s.name}: ${s.count} titles`}
                  onMouseEnter={() => setActive(s.name)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(s.name)}
                  onBlur={() => setActive(null)}
                  style={{ cursor: 'crosshair', outline: 'none' }}
                >
                  <motion.line
                    x1={x1}
                    y1={y1}
                    initial={{ x2: x1, y2: y1 }}
                    animate={{ x2, y2 }}
                    transition={{ ...spring, delay: 0.4 + i * 0.04 }}
                    stroke={stroke}
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  {/* generous hit target */}
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={26} />
                  <motion.text
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 + i * 0.04 }}
                    x={lx}
                    y={ly}
                    transform={`rotate(${flip ? deg + 180 : deg} ${lx} ${ly})`}
                    textAnchor={flip ? 'end' : 'start'}
                    dominantBaseline="central"
                    className="font-tele text-[18px] tracking-[0.06em] sm:text-[13px] sm:tracking-[0.12em]"
                    style={{ fill: isOn ? 'var(--color-bone)' : 'var(--color-fog)' }}
                  >
                    {s.name.toUpperCase()}
                    <tspan dx={8} style={{ fill: 'var(--color-dim)' }}>{s.count}</tspan>
                  </motion.text>
                </motion.g>
              );
            })}
          </AnimatePresence>
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
              className="flex w-[22%] flex-col items-center text-center"
            >
              <span className="font-display text-[clamp(30px,4.6vw,52px)] font-bold leading-none text-bone">
                {hovered ? hovered.count : totalTitles}
              </span>
              <span className="label mt-1.5 max-w-full truncate text-[8.5px] text-fog">
                {hovered ? hovered.name : 'Titles'}
              </span>
              <span className="label mt-1 text-[8px] text-dim">
                {hovered ? `${Math.round((hovered.count / totalTitles) * 100)}% · #${hovered.rank + 1}` : `${genres.length} genres`}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <figcaption className="mt-3 flex items-center justify-center gap-4">
        <span className="label text-dim">Top</span>
        <button
          type="button"
          onClick={() => setTopN((v) => Math.max(MIN_N, v - 1))}
          disabled={n <= MIN_N}
          aria-label="Fewer genres"
          className="grid h-7 w-7 cursor-pointer place-items-center border border-line text-fog transition-colors hover:border-rule hover:text-bone disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus size={12} />
        </button>
        <span className="w-6 text-center font-tele text-sm tabular-nums text-bone" aria-live="polite">
          {String(n).padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={() => setTopN((v) => Math.min(MAX_N, genres.length, v + 1))}
          disabled={n >= Math.min(MAX_N, genres.length)}
          aria-label="More genres"
          className="grid h-7 w-7 cursor-pointer place-items-center border border-line text-fog transition-colors hover:border-rule hover:text-bone disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus size={12} />
        </button>
        <span className="label text-dim">genres · titles can carry several</span>
      </figcaption>
    </figure>
  );
}
