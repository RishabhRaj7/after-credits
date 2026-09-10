import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useScroll,
  useMotionValueEvent,
} from 'framer-motion';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { Grain } from './components/Effects';
import Hero from './components/Hero';
import CutTo, { type CutSpec } from './components/CutTo';
import DetailPanel from './components/DetailPanel';
import ImportPanel from './components/ImportPanel';
import SiteHeader from './components/SiteHeader';
import BehindScenes from './components/BehindScenes';
import Logo from './components/Logo';
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
  const [importTab, setImportTab] = useState<'import' | 'edit'>('import');
  const [behindOpen, setBehindOpen] = useState(false);

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
  const onOpenImport = useCallback(() => {
    setImportTab('import');
    setImportOpen(true);
  }, []);
  const onOpenCollection = useCallback(() => {
    setImportTab('edit');
    setImportOpen(true);
  }, []);
  const onJourney = useCallback(() => {
    if (!viewsRef.current) return;
    const y = viewsRef.current.getBoundingClientRect().top + window.scrollY - 56;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }, []);
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

      <SiteHeader
        count={library.length}
        onJourney={onJourney}
        onCollection={onOpenCollection}
        onBehind={() => setBehindOpen(true)}
      />

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

      <footer className="chrome-orig border-t border-line bg-ink">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 py-7">
            <div className="flex flex-wrap items-center gap-5">
              <Logo />
              <span className="font-tele text-[10px] tracking-[0.18em] text-fog">
                A life measured in stories, not screens.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={onOpenImport}
                className="cursor-pointer font-tele text-[10px] tracking-[0.26em] text-dim transition-colors hover:text-bone"
              >
                {isStored ? 'MANAGE DATA' : 'IMPORT DATA'}
              </button>
              <button
                onClick={() => setBehindOpen(true)}
                className="group flex cursor-pointer items-center gap-1.5 font-tele text-[10px] tracking-[0.26em] text-dim transition-colors hover:text-bone"
              >
                THE SMALL PRINT
                <ArrowUpRight
                  size={12}
                  className="text-blood transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </div>

          <div className="h-px bg-line" />

          <div className="flex flex-wrap items-start justify-between gap-4 py-6">
            <p className="max-w-3xl font-tele text-[9.5px] leading-relaxed tracking-[0.06em] text-dim">
              Watch order uses the date added, not a recorded watch date. Estimated time includes
              each film's runtime (120 min when unknown) and each series' episodes × episode
              runtime (40 min when unknown); ongoing series may undercount. Missing metadata keeps
              its default — it never silently counts zero.
            </p>
            <div className="space-y-1.5 sm:text-right">
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-tele text-[9.5px] tracking-[0.14em] text-fog transition-colors hover:text-bone sm:justify-end"
              >
                Metadata & posters via TMDB
                <ArrowUpRight size={10} className="text-blood" />
              </a>
              <span className="block font-tele text-[8.5px] tracking-[0.08em] text-dim">
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* back to the top */}
      <AnimatePresence>
        {barVisible && (
          <motion.button
            type="button"
            title="Back to the top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed bottom-6 right-6 z-[80] flex h-11 w-11 cursor-pointer items-center justify-center bg-blood text-white shadow-[0_0_26px_rgba(229,9,20,0.55)] transition-colors hover:bg-ember"
          >
            <ArrowUp size={16} strokeWidth={2.4} />
          </motion.button>
        )}
      </AnimatePresence>

      <BehindScenes open={behindOpen} onClose={() => setBehindOpen(false)} count={library.length} />

      <ImportPanel
        open={importOpen}
        initialTab={importTab}
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
