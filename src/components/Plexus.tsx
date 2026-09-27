import { useEffect, useRef } from 'react';
import { cssVar } from '../lib/particles';

/* A drifting constellation: points wander, and any two closer than LINK are
   joined by a hairline that fades with distance. Near the pointer the points
   lean in and wire themselves to it in the accent. Scrolling pushes the
   field, so the page feels like it moves through it. Canvas 2D, pauses off
   screen, one static frame for reduced motion. */

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  big: boolean;
}

const LINK = 132;
const REACH = 190;

export default function Plexus({ className = '', density = 1 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bone = cssVar('--color-bone') || '#eeeae3';
    const accent = cssVar('--color-blood') || '#ff4533';
    const rgb = (hex: string) => {
      const v = parseInt(hex.replace('#', ''), 16);
      return `${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}`;
    };
    const boneRgb = rgb(bone);
    const accentRgb = rgb(accent);

    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    let raf = 0;
    let visible = true;
    const pointer = { x: -9999, y: -9999, on: false };
    let lastScroll = window.scrollY;

    const seed = () => {
      const count = Math.round(Math.min(120, Math.max(28, ((w * h) / 15000) * density)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        big: Math.random() < 0.12,
      }));
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const grew = Math.abs(r.width - w) > 80 || Math.abs(r.height - h) > 80;
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (grew || !nodes.length) seed();
      if (reduced) draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;
          const t = 1 - Math.sqrt(d2) / LINK;
          ctx.strokeStyle = `rgba(${boneRgb}, ${(t * 0.2).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      if (pointer.on) {
        for (const a of nodes) {
          const d = Math.hypot(a.x - pointer.x, a.y - pointer.y);
          if (d > REACH) continue;
          ctx.strokeStyle = `rgba(${accentRgb}, ${((1 - d / REACH) * 0.55).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }
      for (const a of nodes) {
        const near = pointer.on && Math.hypot(a.x - pointer.x, a.y - pointer.y) < REACH;
        ctx.fillStyle = near ? accent : `rgba(${boneRgb}, ${a.big ? 0.85 : 0.45})`;
        const s = a.big ? 2.6 : 1.5;
        ctx.beginPath();
        ctx.arc(a.x, a.y, s, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      const scroll = window.scrollY;
      const dv = Math.max(-40, Math.min(40, scroll - lastScroll));
      lastScroll = scroll;
      for (const a of nodes) {
        if (pointer.on) {
          const dx = pointer.x - a.x;
          const dy = pointer.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d < REACH && d > 1) {
            a.vx += (dx / d) * 0.012;
            a.vy += (dy / d) * 0.012;
          }
        }
        a.vy -= dv * 0.0025 * (a.big ? 1.6 : 1); // scroll parallax
        a.vx *= 0.985;
        a.vy *= 0.985;
        // keep a minimum drift so the field never freezes
        if (Math.abs(a.vx) + Math.abs(a.vy) < 0.08) {
          a.vx += (Math.random() - 0.5) * 0.06;
          a.vy += (Math.random() - 0.5) * 0.06;
        }
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < -20) a.x = w + 20;
        if (a.x > w + 20) a.x = -20;
        if (a.y < -20) a.y = h + 20;
        if (a.y > h + 20) a.y = -20;
      }
    };

    const tick = () => {
      if (!visible || document.hidden) {
        raf = 0;
        return;
      }
      step();
      draw();
      raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!reduced && !raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.on = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= r.width && pointer.y <= r.height && e.pointerType === 'mouse';
    };
    const onLeave = () => (pointer.on = false);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    io.observe(canvas);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', wake);
    resize();
    wake();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [density]);

  return <canvas ref={ref} aria-hidden="true" className={`block h-full w-full ${className}`} />;
}
