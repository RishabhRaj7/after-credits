import { useMemo } from 'react';
import { motion, motionValue, useTransform, type MotionValue } from 'framer-motion';
import { Poster } from './Poster';
import type { Entry } from '../data/library';

function hashN(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Layer 1 — ambient collage of the most recently watched titles, dimmed to
 * texture. Sits behind everything on the right half of the hero; drifts on a
 * slow breathe and shifts a few pixels against the pointer for depth.
 */
export default function GhostPosterWall({
  entries,
  mx,
  my,
}: {
  entries: Entry[];
  mx?: MotionValue<number>;
  my?: MotionValue<number>;
}) {
  /* most recently watched, strided so binges don't dominate the wall */
  const picks = useMemo(() => {
    const recent = [...entries].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    const out: Entry[] = [];
    for (let i = 0; i < recent.length && out.length < 30; i += 1) out.push(recent[i]);
    return out;
  }, [entries]);

  const zero = useMemo(() => motionValue(0), []);
  const x = useTransform(mx ?? zero, (v) => v * -14);
  const y = useTransform(my ?? zero, (v) => v * -10);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div style={{ x, y }} className="absolute inset-[-12%]">
        <div
          className="wall-breathe grid h-full w-full grid-cols-4 gap-2 opacity-[0.38]"
          style={{
            filter: 'grayscale(0.35) saturate(0.5) brightness(0.62) contrast(0.92)',
            maskImage:
              'linear-gradient(100deg, transparent 2%, black 26%, black 96%, transparent), linear-gradient(180deg, transparent 0%, black 12%, black 88%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(100deg, transparent 2%, black 26%, black 96%, transparent), linear-gradient(180deg, transparent 0%, black 12%, black 88%, transparent 100%)',
            maskComposite: 'intersect',
            WebkitMaskComposite: 'source-in',
          }}
        >
          {picks.map((e) => {
            const h = hashN(e.id);
            const tilt = ((h % 5) - 2) * 0.9;
            const dim = 0.55 + ((h >> 3) % 40) / 100;
            return (
              <div
                key={e.id}
                className="aspect-[2/3] overflow-hidden rounded-[2px] border border-white/[0.04]"
                style={{ transform: `rotate(${tilt}deg)`, opacity: dim }}
              >
                <Poster entry={e} className="h-full w-full" />
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* blood wash + centre pool so the chart reads clean over the wall */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 62% 54% at 52% 48%, rgba(10,10,12,0.9) 0%, rgba(10,10,12,0.55) 55%, transparent 100%), linear-gradient(90deg, rgba(10,10,12,0.95) 0%, rgba(10,10,12,0.35) 34%, transparent 70%), linear-gradient(0deg, rgba(229,9,20,0.05), transparent 40%)',
        }}
      />
    </div>
  );
}
