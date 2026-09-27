import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useScroll } from 'framer-motion';
import SiteHeader from './components/SiteHeader';
import Hero from './components/Hero';
import Almanac from './components/Almanac';
import ControlDeck, { ProjectionTabs, VIEW_META, type ViewId } from './components/ControlDeck';
import CutTo, { CUT_MS, SWAP_MS } from './components/CutTo';
import DetailPanel from './components/DetailPanel';
import SearchPalette from './components/SearchPalette';
import Footer from './components/Footer';
import BehindScenes from './components/BehindScenes';
import ImportPanel from './components/ImportPanel';
import ClusterBurst from './views/ClusterBurst';
import Reel from './views/Reel';
import {
  LIBRARY,
  decadeStats,
  genreStats,
  groupByYear,
  prepareLibrary,
  sortedEntries,
  statsFor,
  yearOf,
  type Dir,
  type Entry,
  type Order,
  type TypeFilter,
} from './data/library';
import {
  clearStoredLibrary,
  deleteServerLibrary,
  fetchServerLibrary,
  loadStoredLibrary,
  saveServerLibrary,
  saveStoredLibrary,
  type StoreMode,
} from './data/importer';
import { applyOverlay, diffOverlay, fetchOverlay, liveEnabled, publishOverlay } from './data/live';
import type { DataTab } from './components/ImportPanel';

const scrollToEl = (el: HTMLElement | null, offset = 0) => {
  if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset), behavior: 'smooth' });
};

export default function App() {
  /* the active library: with a live gist configured, the baked library plus
     the gist's changes (for every visitor); otherwise server store → browser
     store → baked */
  const live = liveEnabled();
  const [library, setLibrary] = useState<Entry[]>(() => {
    const stored = live ? null : loadStoredLibrary();
    return stored ? prepareLibrary(stored) : LIBRARY;
  });
  const [storeMode, setStoreMode] = useState<StoreMode>(() => (live ? 'live' : loadStoredLibrary() ? 'browser' : 'sample'));
  useEffect(() => {
    let alive = true;
    if (live) {
      fetchOverlay().then((overlay) => {
        if (alive && overlay) setLibrary(prepareLibrary(applyOverlay(LIBRARY, overlay)));
      });
    } else {
      fetchServerLibrary().then((entries) => {
        if (!alive || !entries) return;
        setLibrary(prepareLibrary(entries));
        setStoreMode('server');
      });
    }
    return () => {
      alive = false;
    };
  }, [live]);

  const [view, setView] = useState<ViewId>('burst');
  const [order, setOrder] = useState<Order>('watch');
  const [dir, setDir] = useState<Dir>('asc');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  useEffect(() => setHidden(new Set()), [order]); // years mean something else in the other sequence

  const [selected, setSelected] = useState<Entry | null>(null);
  const [cut, setCut] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importTab, setImportTab] = useState<DataTab>('log');
  const [notesOpen, setNotesOpen] = useState(false);

  const stats = useMemo(() => statsFor(library), [library]);
  const genres = useMemo(() => genreStats(library), [library]);

  /* one filter pipeline, shared by both projections */
  const typed = useMemo(() => (typeFilter === 'all' ? library : library.filter((e) => e.type === typeFilter)), [library, typeFilter]);
  const groups = useMemo(() => groupByYear(typed, order), [typed, order]);
  const decades = useMemo(() => decadeStats(groups), [groups]);
  const visible = useMemo(() => typed.filter((e) => !hidden.has(yearOf(e, order))), [typed, hidden, order]);
  const sequence = useMemo(() => {
    const s = sortedEntries(visible, order);
    return dir === 'asc' ? s : s.reverse();
  }, [visible, order, dir]);

  const toggleYear = useCallback((y: number) => {
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(y)) n.delete(y);
      else n.add(y);
      return n;
    });
  }, []);
  const toggleDecade = useCallback(
    (d: number) => {
      setHidden((h) => {
        const n = new Set(h);
        const ys = groups.filter((g) => Math.floor(g.year / 10) * 10 === d).map((g) => g.year);
        const allIn = ys.every((y) => !n.has(y));
        ys.forEach((y) => (allIn ? n.add(y) : n.delete(y)));
        return n;
      });
    },
    [groups],
  );
  const resetFilters = useCallback(() => {
    setHidden(new Set());
    setTypeFilter('all');
  }, []);

  const almanacRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLElement>(null);
  const deckAnchorRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: logRef, offset: ['start start', 'end end'] });

  /* CUT TO: leader covers → swap the mounted view → leader wipes off */
  const onSwitch = useCallback(
    (v: ViewId) => {
      if (v === view || cut) return;
      setCut(VIEW_META[v].label);
      window.setTimeout(() => {
        setView(v);
        const el = deckAnchorRef.current;
        if (el && el.getBoundingClientRect().top < 0) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY });
      }, SWAP_MS);
      window.setTimeout(() => setCut(null), CUT_MS);
    },
    [view, cut],
  );

  /* "/" or ⌘K opens search from anywhere that isn't a text field */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onSelect = useCallback((e: Entry) => setSelected(e), []);
  const onClose = useCallback(() => setSelected(null), []);
  const onPick = useCallback((e: Entry) => {
    setSearchOpen(false);
    setSelected(e);
  }, []);
  const openData = useCallback((tab: DataTab) => {
    setImportTab(tab);
    setImportOpen(true);
  }, []);
  const onImported = useCallback(async (entries: Entry[]) => {
    if (live) {
      // only the difference from the bake goes to the gist; throws on failure so the panel can say why
      const next = prepareLibrary(entries);
      await publishOverlay(diffOverlay(LIBRARY, next));
      setLibrary(next);
      return;
    }
    const onServer = await saveServerLibrary(entries);
    if (!onServer) saveStoredLibrary(entries); // static host → keep it in the browser
    setLibrary(prepareLibrary(entries));
    setStoreMode(onServer ? 'server' : 'browser');
  }, [live]);
  const onRestore = useCallback(async () => {
    if (live) {
      await publishOverlay(diffOverlay(LIBRARY, LIBRARY));
      setLibrary(LIBRARY);
      return;
    }
    await deleteServerLibrary();
    clearStoredLibrary();
    setLibrary(LIBRARY);
    setStoreMode('sample');
  }, [live]);

  const goLog = () => scrollToEl(deckAnchorRef.current);
  const goAlmanac = () => scrollToEl(almanacRef.current);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen bg-ink text-bone">
        <CutTo label={cut} />

        <SiteHeader
          count={library.length}
          onTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          onLog={goLog}
          onAlmanac={goAlmanac}
          onNotes={() => setNotesOpen(true)}
          onSearch={() => setSearchOpen(true)}
        />

        <main>
          <Hero entries={library} stats={stats} genres={genres} onEnterLog={goLog} onAlmanac={goAlmanac} />

          <div ref={almanacRef}>
            <Almanac entries={library} onOpen={onSelect} />
          </div>

          <section id="log" ref={logRef} className="relative">
            <div className="mx-auto max-w-[1600px] px-4 pt-20 sm:px-8 lg:pt-28">
              <div className="label text-blood">02 — The log</div>
              <div className="mt-6">
                <ProjectionTabs view={view} onSwitch={onSwitch} />
              </div>
            </div>

            <div ref={deckAnchorRef} />
            <ControlDeck
              view={view}
              onSwitch={onSwitch}
              order={order}
              onOrder={setOrder}
              dir={dir}
              onDir={setDir}
              typeFilter={typeFilter}
              onTypeFilter={setTypeFilter}
              groups={groups}
              decades={decades}
              hidden={hidden}
              onToggleYear={toggleYear}
              onToggleDecade={toggleDecade}
              onAll={() => setHidden(new Set())}
              onSearch={() => setSearchOpen(true)}
              progress={scrollYProgress}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={`${view}:${order}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="pt-10"
              >
                {visible.length === 0 ? (
                  <div className="mx-auto max-w-xl px-4 py-32 text-center">
                    <div className="font-display text-6xl font-extrabold uppercase text-rule">Reel empty</div>
                    <p className="mt-4 text-sm text-fog">Every year is filtered out.</p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="label mt-6 cursor-pointer border border-bone px-5 py-3 text-bone transition-colors hover:bg-bone hover:text-ink"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : view === 'burst' ? (
                  <ClusterBurst items={visible} order={order} dir={dir} onSelect={onSelect} />
                ) : (
                  <Reel items={visible} order={order} dir={dir} onSelect={onSelect} />
                )}
              </motion.div>
            </AnimatePresence>
          </section>
        </main>

        <Footer stored={storeMode !== 'sample'} onManage={() => openData('log')} onNotes={() => setNotesOpen(true)} />

        <SearchPalette open={searchOpen} entries={library} onClose={() => setSearchOpen(false)} onPick={onPick} />
        <BehindScenes open={notesOpen} onClose={() => setNotesOpen(false)} count={library.length} onManage={() => { setNotesOpen(false); openData('log'); }} />
        <ImportPanel
          open={importOpen}
          initialTab={importTab}
          onClose={() => setImportOpen(false)}
          onImported={onImported}
          onCommit={onImported}
          entries={library}
          storeMode={storeMode}
          onRestore={onRestore}
        />
        <DetailPanel
          entry={selected}
          sequence={sequence}
          order={order}
          totalMinutes={stats.minutes}
          onSelect={onSelect}
          onClose={onClose}
        />
      </div>
    </MotionConfig>
  );
}
