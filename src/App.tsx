import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import ImportPanel from './components/ImportPanel';
import { TopBar, VIEW_META, type ViewId } from './components/Controls';
import ClusterBurst from './views/ClusterBurst';
import Reel from './views/Reel';
import { LIBRARY, sortedEntries, statsFor, type Entry, type Order, type TypeFilter } from './data/library';
import {
  clearStoredLibrary,
  deleteServerLibrary,
  fetchServerLibrary,
  loadStoredLibrary,
  saveServerLibrary,
  saveStoredLibrary,
  type StoreMode,
} from './data/importer';

export default function App() {
  const [view, setView] = useState<ViewId>('burst');
  const [order, setOrder] = useState<Order>('watch');
  const [selected, setSelected] = useState<Entry | null>(null);
  const [cut, setCut] = useState<CutSpec | null>(null);
  const [barVisible, setBarVisible] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  /* the active library, in priority order: server store → browser store →
     baked-in sample export */
  const [library, setLibrary] = useState<Entry[]>(() => loadStoredLibrary() ?? LIBRARY);
  const [storeMode, setStoreMode] = useState<StoreMode>(() =>
    loadStoredLibrary() ? 'browser' : 'sample',
  );

  useEffect(() => {
    let alive = true;
    fetchServerLibrary().then((entries) => {
      if (!alive || !entries) return;
      setLibrary(entries);
      setStoreMode('server');
    });
    return () => {
      alive = false;
    };
  }, []);

  const items = useMemo(() => sortedEntries(library, order), [library, order]);
  const stats = useMemo(() => statsFor(library), [library]);
  const viewsRef = useRef<HTMLDivElement>(null);
  const isStored = storeMode !== 'sample';

  /* shared by both views so filters + sort persist across view switches */
  const [hiddenYears, setHiddenYears] = useState<Set<number>>(new Set());
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  useEffect(() => setHiddenYears(new Set()), [order]);
  const viewItems = useMemo(
    () => (typeFilter === 'all' ? items : items.filter((e) => e.type === typeFilter)),
    [items, typeFilter],
  );

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
  const onOpenImport = useCallback(() => setImportOpen(true), []);
  const onImported = useCallback(async (entries: Entry[]) => {
    const onServer = await saveServerLibrary(entries);
    if (!onServer) saveStoredLibrary(entries); // static host → keep it in the browser
    setLibrary(entries);
    setStoreMode(onServer ? 'server' : 'browser');
  }, []);
  const onRestoreSample = useCallback(async () => {
    await deleteServerLibrary();
    clearStoredLibrary();
    setLibrary(LIBRARY);
    setStoreMode('sample');
  }, []);

  return (
    <div className="relative min-h-screen bg-ink text-bone">
      <Grain />
      <CutTo cut={cut} />

      <AnimatePresence>
        {barVisible && (
          <TopBar
            order={order}
            view={view}
            onOrder={onOrder}
            onSwitch={onSwitch}
            onImport={onOpenImport}
            stats={stats}
            progress={scrollYProgress}
          />
        )}
      </AnimatePresence>

      <Hero order={order} view={view} onOrder={onOrder} onSwitch={onSwitch} entries={library} stats={stats} />

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
              <ClusterBurst
                items={viewItems}
                order={order}
                onSelect={onSelect}
                hidden={hiddenYears}
                onHidden={setHiddenYears}
                dir={dir}
                onDir={setDir}
                typeFilter={typeFilter}
                onTypeFilter={setTypeFilter}
              />
            ) : (
              <Reel
                items={viewItems}
                order={order}
                onSelect={onSelect}
                hidden={hiddenYears}
                onHidden={setHiddenYears}
                dir={dir}
                onDir={setDir}
                typeFilter={typeFilter}
                onTypeFilter={setTypeFilter}
              />
            )}
          </motion.main>
        </AnimatePresence>
      </div>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 font-tele text-[9px] tracking-[0.26em] text-dim">
          <span>AFTER CREDITS · A PERSONAL SCREENING HISTORY</span>
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenImport}
              className="cursor-pointer tracking-[0.26em] text-fog transition-colors hover:text-blood"
            >
              {isStored ? 'MANAGE LOCAL DATA' : 'IMPORT YOUR CSV'}
            </button>
            <span>NO SPOILERS PAST THIS POINT</span>
          </div>
        </div>
      </footer>

      <ImportPanel
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={onImported}
        onCommit={onImported}
        entries={library}
        activeCount={library.length}
        storeMode={storeMode}
        onRestoreSample={onRestoreSample}
      />

      <DetailPanel entry={selected} order={order} onClose={onClose} />
    </div>
  );
}
