import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cssVar, ParticleField, resolveFontFamily } from '../lib/particles';

/* The cut between projections, driven by App in two phases:
     in   shutters slam shut, a red beam sweeps, particles swarm into the
          name of the next view; once it has formed (FORMED_MS) App swaps
          the view underneath, in a transition so the swarm keeps moving
     out  after the new view has painted: flash, the letters detonate, and
          the shutters tear open (EXIT_MS later App clears the cut) */

export const FORMED_MS = 820;
export const EXIT_MS = 520;
const SLATS = 7;
const SLAM = [0.76, 0, 0.24, 1] as const;

export interface Cut {
  label: string;
  phase: 'in' | 'out';
}

function Swarm({ label, phase }: Cut) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<ParticleField | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFallback(true);
      return;
    }
    const narrow = window.innerWidth < 640;
    let field: ParticleField;
    try {
      field = new ParticleField(canvas, {
        gap: narrow ? 4 : 6,
        dot: narrow ? 2 : 3,
        radius: 0,
        intro: 'scatter',
        accentShare: 0.08,
        // form fast and together: the name has to read before the swap
        sweep: 0.12,
        jitter: 0.08,
        spring: 0.11,
      });
    } catch {
      setFallback(true);
      return;
    }
    fieldRef.current = field;
    field.setColors({ ink: cssVar('--color-bone'), accent: cssVar('--color-blood') });
    field.resize();
    field.setShape(
      { lines: [label.toUpperCase()], family: resolveFontFamily('font-display'), weight: 800, fill: 0.72, leading: 0.9, align: 'center' },
      false,
    );
    return () => {
      field.destroy();
      fieldRef.current = null;
    };
  }, [label]);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = ref.current;
    if (phase !== 'out' || !field || !canvas) return;
    const r = canvas.getBoundingClientRect();
    field.burst(r.width / 2, r.height / 2, 30);
    field.setMode('swarm');
  }, [phase]);

  return (
    <>
      <canvas ref={ref} className="absolute inset-x-0 top-1/2 h-[40vh] w-full -translate-y-1/2" aria-hidden />
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

export default function CutTo({ cut }: { cut: Cut | null }) {
  const out = cut?.phase === 'out';
  return (
    <AnimatePresence>
      {cut && (
        <motion.div key="cut" className="pointer-events-none fixed inset-0 z-[85] overflow-hidden" aria-hidden>
          {/* shutters: slam in on mount, tear open on exit */}
          {Array.from({ length: SLATS }, (_, i) => (
            <motion.div
              key={i}
              className="absolute inset-x-0 border-b border-line bg-ink"
              style={{ top: `${(i / SLATS) * 100}%`, height: `${100 / SLATS + 0.2}%`, willChange: 'transform' }}
              initial={{ x: i % 2 ? '100%' : '-100%' }}
              animate={{ x: '0%' }}
              exit={{ x: i % 2 ? '-100%' : '100%', transition: { duration: 0.42, delay: i * 0.025, ease: SLAM } }}
              transition={{ duration: 0.34, delay: i * 0.03, ease: SLAM }}
            />
          ))}

          {/* beam sweep while closing, horizon line while the name holds */}
          <motion.div
            className="absolute inset-y-0 w-px bg-blood"
            initial={{ left: '-2%' }}
            animate={{ left: '102%' }}
            transition={{ duration: 0.5, delay: 0.12, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-x-0 top-1/2 h-px origin-center bg-blood"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: out ? 0 : 1 }}
            transition={{ duration: out ? 0.2 : 0.5, delay: out ? 0 : 0.3, ease: SLAM }}
          />

          {/* flash as the letters detonate */}
          {out && (
            <motion.div
              className="absolute inset-0 bg-bone"
              initial={{ opacity: 0.2 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}

          <motion.div className="absolute inset-0" exit={{ opacity: 0, transition: { duration: 0.4 } }}>
            <Swarm label={cut.label} phase={cut.phase} />
          </motion.div>

          {/* HUD */}
          <motion.div
            className="label absolute inset-x-4 top-[calc(50%-23vh)] flex justify-between text-[9.5px] sm:inset-x-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: out ? 0 : 1 }}
            transition={{ delay: out ? 0 : 0.25, duration: 0.2 }}
          >
            <span className="text-blood">Cut to</span>
            <span className="text-fog">
              <Timecode />
            </span>
          </motion.div>
          <motion.div
            className="label absolute inset-x-4 bottom-[calc(50%-23vh)] flex justify-between text-[9.5px] text-dim sm:inset-x-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: out ? 0 : 1 }}
            transition={{ delay: out ? 0 : 0.3, duration: 0.2 }}
          >
            <span>Projection change</span>
            <span>24 fps · reel swap</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
