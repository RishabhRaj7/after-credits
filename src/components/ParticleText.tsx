import { useEffect, useRef } from 'react';
import { cssVar, ParticleField, resolveFontFamily } from '../lib/particles';

/* Text printed in a few thousand points. Move over it and the glyphs come
   apart around the pointer; press and they scatter harder. The parent owns
   which shape is showing — change `index` and the points re-form into it. */

/* on narrow screens a long single line splits in two so it stays big */
function fitLines(lines: string[], width: number): string[] {
  if (lines.length !== 1 || width >= 520) return lines;
  const words = lines[0].split(' ');
  if (words.length < 2) return lines;
  const imbalance = (i: number) =>
    Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
  let best = 1;
  for (let i = 2; i < words.length; i++) if (imbalance(i) < imbalance(best)) best = i;
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

export default function ParticleText({
  shapes,
  index,
  onAdvance,
  align = 'left',
  density = 1,
  ambient = true,
  className = '',
}: {
  shapes: string[][];
  index: number;
  onAdvance?: () => void;
  align?: 'left' | 'center';
  /** >1 packs points tighter */
  density?: number;
  /** keep a slow drift + scan sweep going between shapes */
  ambient?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<ParticleField | null>(null);
  const familyRef = useRef('');
  const readyRef = useRef(false);
  const latest = useRef({ shapes, index, align });
  latest.current = { shapes, index, align };

  const shapeFor = (i: number) => {
    const { shapes: list, align: a } = latest.current;
    const width = canvasRef.current?.clientWidth ?? 1000;
    return { lines: fitLines(list[i] ?? list[0], width), family: familyRef.current, weight: 800, leading: 0.9, fill: 1, align: a };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const narrow = window.innerWidth < 640;
    let field: ParticleField;
    try {
      field = new ParticleField(canvas, {
        gap: Math.max(2, Math.round((narrow ? 3 : 4) / density)),
        dot: narrow ? 1.8 : 2.2,
        radius: narrow ? 60 : 110,
        intro: 'scatter',
        accentShare: 0.035,
        ambient,
      });
    } catch {
      return;
    }
    fieldRef.current = field;
    let cancelled = false;
    const family = resolveFontFamily('font-display');
    familyRef.current = family;
    // the display face must be loaded before rasterising, or the points trace the fallback
    const ready = document.fonts?.load ? document.fonts.load(`800 120px ${family}`) : Promise.resolve();
    ready
      .catch(() => undefined)
      .then(() => {
        if (cancelled) return;
        field.setColors({ ink: cssVar('--color-bone'), accent: cssVar('--color-blood') });
        field.resize();
        field.setShape(shapeFor(latest.current.index), false);
        readyRef.current = true;
      });

    const ro = new ResizeObserver(() => field.resize());
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => field.setVisible(entry.isIntersecting));
    io.observe(canvas);
    return () => {
      cancelled = true;
      readyRef.current = false;
      ro.disconnect();
      io.disconnect();
      field.destroy();
      fieldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [density, ambient]);

  // re-form whenever the requested shape (or its text) changes
  const key = JSON.stringify(shapes[index]);
  useEffect(() => {
    if (fieldRef.current && readyRef.current) fieldRef.current.setShape(shapeFor(index));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, key]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        onClick={onAdvance}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full touch-pan-y ${onAdvance ? 'cursor-crosshair' : ''}`}
      />
    </div>
  );
}
