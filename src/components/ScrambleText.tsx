import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

/* Text that decodes into place: glyphs cycle through noise and lock in left
   to right the first time it scrolls into view. Screen readers get the
   final text straight away. */

const NOISE = '01#/\\<>_+=*%$ABCDEFGHKXYZ';

export default function ScrambleText({
  text,
  className = '',
  duration = 700,
  delay = 0,
}: {
  text: string;
  className?: string;
  duration?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-12% 0px' });
  const [shown, setShown] = useState(() => text.replace(/\S/g, ' '));

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(text);
      return;
    }
    let raf = 0;
    const start = performance.now() + delay;
    const frame = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const locked = Math.floor(t * text.length);
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (i < locked || ch === ' ') out += ch;
        else if (now < start) out += ' ';
        else out += NOISE[(Math.random() * NOISE.length) | 0];
      }
      setShown(out);
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [inView, text, duration, delay]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
