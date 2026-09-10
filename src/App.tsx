import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useScroll,
  useMotionValueEvent,
} from 'framer-motion';
import { Grain } from './components/Effects';
import Hero from './components/Hero';
import CutTo, { type CutSpec } from './components/CutTo';
import DetailPanel from './components/DetailPanel';
import { TopBar, VIEW_META, type ViewId } from './components/Controls';
import ClusterBurst from './views/ClusterBurst';
import Reel from './views/Reel';
import { orderedEntries, type Entry, type Order } from './data/library';

export default function App() {
  const [view, setView] = useState<ViewId>('burst');
  const [order, setOrder] = useState<Order>('watch');
  const [selected, setSelected] = useState<Entry | null>(null);
  const [cut, setCut] = useState<CutSpec | null>(null);
  const [barVisible, setBarVisible] = useState(false);

  const items = useMemo(() => orderedEntries(order), [order]);
  const viewsRef = useRef<HTMLDivElement>(null);

  /* page scroll → top-bar hairline + visibility */
  const { scrollY, scrollYProgress } = useScroll();
  useMotionValueEvent(scrollY, 'change', (v) => {
    const show = v > window.innerHeight * 0.9;
    setBarVisible((prev) => (prev === show ? prev : show));
  });

  /* CUT TO: wipe covers → swap the mounted view → wipe exits */
  const onSwitch = useCallback(
    (v: ViewId) => {
      if (v === view || cut) return;
      setCut({
        label: VIEW_META[v].label,
        scene: v === 'reel' ? 'SCENE 02 / TAKE 01' : 'SCENE 01 / TAKE 02',
      });
      window.setTimeout(() => {
        setView(v);
        if (viewsRef.current) {
          const y = viewsRef.current.getBoundingClientRect().top + window.scrollY - 48;
          window.scrollTo({ top: y, behavior: 'auto' });
        }
      }, 380);
      window.setTimeout(() => setCut(null), 430);
    },
    [view, cut],
  );

  const onOrder = useCallback((o: Order) => setOrder(o), []);
  const onSelect = useCallback((e: Entry) => setSelected(e), []);
  const onClose = useCallback(() => setSelected(null), []);

  return (
    <div className="relative min-h-screen bg-ink text-bone">
      <Grain />
      <CutTo cut={cut} />

      <AnimatePresence>
        {barVisible && (
          <TopBar order={order} view={view} onOrder={onOrder} onSwitch={onSwitch} progress={scrollYProgress} />
        )}
      </AnimatePresence>

      <Hero order={order} view={view} onOrder={onOrder} onSwitch={onSwitch} />

      {/* the projection itself — keyed so order flips and view swaps reflow
          through a quick editorial blur instead of a hard reload */}
      <div ref={viewsRef}>
        <AnimatePresence mode="wait">
          <motion.main
            key={`${view}:${order}`}
            initial={{ opacity: 0, y: 30, filter: 'blur(7px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(7px)' }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            {view === 'burst' ? (
              <ClusterBurst items={items} order={order} onSelect={onSelect} />
            ) : (
              <Reel items={items} order={order} onSelect={onSelect} />
            )}
          </motion.main>
        </AnimatePresence>
      </div>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 font-tele text-[9px] tracking-[0.26em] text-dim">
          <span>AFTER CREDITS · A PERSONAL SCREENING HISTORY</span>
          <span>NO SPOILERS PAST THIS POINT</span>
        </div>
      </footer>

      <DetailPanel entry={selected} order={order} onClose={onClose} />
    </div>
  );
}
