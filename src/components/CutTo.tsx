import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cssVar, ParticleField, resolveFontFamily } from '../lib/particles';

/* The cut between projections, in three beats:
     1. shutters slam shut from alternating sides, a red beam sweeps across
     2. a particle swarm assembles the name of the next view; timecode runs
     3. the view swaps underneath, the letters detonate, the shutters tear open
   App swaps the view at SWAP_MS and clears the cut at CUT_MS. */

export const SWAP_MS = 560;
export const CUT_MS = 1300;
const DETONATE_MS = 980;
const SLATS = 7;
const SLAM = [0.76, 0, 0.24, 1] as const;

function Swarm({ label }: { label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFallback(true);
      return;
    }
    let field: ParticleField;
    try {
      field = new ParticleField(canvas, {
        gap: window.innerWidth < 640 ? 3 : 5,
        dot: window.innerWidth < 640 ? 1.8 : 2.6,
        radius: 0,
        intro: 'scatter',
        accentShare: 0.08,
      });
    } catch {
      setFallback(true);
      return;
    }
    const family = resolveFontFamily('font-display');
    field.setColors({ ink: cssVar('--color-bone'), accent: cssVar('--color-blood') });
    field.resize();
    field.setShape({ lines: [label.toUpperCase()], family, weight: 800, fill: 0.78, leading: 0.9, align: 'center' }, false);
    const t = window.setTimeout(() => {
      const r = canvas.getBoundingClientRect();
      field.burst(r.width / 2, r.height / 2, 34);
      field.setMode('swarm');
    }, DETONATE_MS);
    return () => {
      window.clearTimeout(t);
      field.destroy();
    };
  }, [label]);

  return (
    <>
      <canvas ref={ref} className="absolute inset-x-0 top-1/2 h-[42vh] w-full -translate-y-1/2" aria-hidden />
      {fallback && (
        <div className="absolute inset-0 grid place-items-center font-display text-6xl font-extrabold uppercase text-bone sm:text-8xl">{label}</div>
      )}
    </>
  );
}

/* a timecode that races while the cut is on screen */
function Timecode() {
  const [f, setF] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setF(Math.floor(((now - start) / 1000) * 24 * 7));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="tabular-nums">
      TC 00:{pad(Math.floor(f / 1440) % 60)}:{pad(Math.floor(f / 24) % 60)}:{pad(f % 24)}
    </span>
  );
}

export default function CutTo({ label }: { label: string | null }) {
  return (
    <AnimatePresence>
      {label && (
        <motion.div key="cut" className="pointer-events-none fixed inset-0 z-[85] overflow-hidden" aria-hidden>
          {/* shutters */}
          {Array.from({ length: SLATS }, (_, i) => {
            const from = i % 2 ? '100%' : '-100%';
            return (
              <motion.div
                key={i}
                className="absolute inset-x-0 border-b border-line bg-ink"
                style={{ top: `${(i / SLATS) * 100}%`, height: `${100 / SLATS + 0.2}%` }}
                initial={{ x: from }}
                animate={{ x: '0%' }}
                exit={{ x: i % 2 ? '-100%' : '100%', transition: { duration: 0.42, delay: i * 0.03, ease: SLAM } }}
                transition={{ duration: 0.36, delay: i * 0.035, ease: SLAM }}
              />
            );
          })}

          {/* beam */}
          <motion.div
            className="absolute inset-y-0 w-px bg-blood"
            initial={{ left: '-2%', opacity: 1 }}
            animate={{ left: '102%' }}
            transition={{ duration: 0.55, delay: 0.18, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-x-0 top-1/2 h-px bg-blood"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: [0, 1, 1, 0] }}
            transition={{ duration: 1.0, times: [0, 0.35, 0.8, 1], delay: 0.25 }}
          />

          {/* flash as the letters detonate */}
          <motion.div
            className="absolute inset-0 bg-bone"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.18, 0] }}
            transition={{ duration: 1.25, times: [0, 0.76, 0.8, 0.92] }}
          />

          <motion.div className="absolute inset-0" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.45 } }}>
            <Swarm label={label} />
          </motion.div>

          {/* HUD */}
          <motion.div
            className="label absolute inset-x-4 top-[calc(50%-24vh)] flex justify-between text-[9.5px] sm:inset-x-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-blood">Cut to</span>
            <span className="text-fog">
              <Timecode />
            </span>
          </motion.div>
          <motion.div
            className="label absolute inset-x-4 bottom-[calc(50%-24vh)] flex justify-between text-[9.5px] text-dim sm:inset-x-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.36 }}
          >
            <span>Projection change</span>
            <span>24 fps · reel swap</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
