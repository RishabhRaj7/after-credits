import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'framer-motion';

interface Props {
  value: number;
  duration?: number;
  delay?: number;
  pad?: number;
  className?: string;
  once?: boolean;
  format?: (n: number) => string;
}

/**
 * Counts from 0 → value when scrolled into view. Used for the hero
 * watch-time reveal; easeOutExpo so the number "lands" like a recap stat.
 */
export default function CountUp({
  value, duration = 2.6, delay = 0, pad = 0, className = '', format, once = true,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, margin: '-8% 0px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.15, 0.85, 0.25, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, duration, delay]);

  const text = format ? format(display) : pad
    ? String(display).padStart(pad, '0')
    : display.toLocaleString('en-US');

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
