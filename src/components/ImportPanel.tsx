import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileUp,
  KeyRound,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import type { Entry } from '../data/library';
import {
  enrichRows,
  getTmdbKey,
  parseLibraryCsv,
  setTmdbKey,
  type EnrichProgress,
  type StoreMode,
} from '../data/importer';
import EditorPanel from './EditorPanel';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (entries: Entry[]) => Promise<void>;
  onCommit: (entries: Entry[]) => Promise<void>;
  entries: Entry[];
  activeCount: number;
  storeMode: StoreMode;
  onRestoreSample: () => Promise<void>;
}

const field =
  'w-full border border-line bg-ink/80 px-3 py-2 font-tele text-[11px] tracking-[0.06em] text-bone placeholder:text-dim/70 outline-none transition-colors focus:border-blood/70';

const MODE_LABEL: Record<StoreMode, string> = {
  server: 'SERVER STORE ACTIVE',
  browser: 'BROWSER STORE ACTIVE',
  sample: 'SAMPLE LIBRARY ACTIVE',
};

export default function ImportPanel({
  open,
  onClose,
  onImported,
  onCommit,
  entries,
  activeCount,
  storeMode,
  onRestoreSample,
}: Props) {
  const [tab, setTab] = useState<'import' | 'edit'>('import');
  const [key, setKey] = useState(() => getTmdbKey());
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState<EnrichProgress | null>(null);
  const [error, setError] = useState('');
  const [resultCount, setResultCount] = useState(0);
  const cancelRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(
    () => (csvText.trim() ? parseLibraryCsv(csvText) : null),
    [csvText],
  );
  const ready = !!parsed && parsed.rows.length > 0 && key.trim().length > 8;
  const busy = phase === 'running';

  const onFile = (f: File | undefined) => {
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ''));
    reader.readAsText(f);
  };

  const run = async () => {
    if (!parsed || !ready) return;
    setError('');
    setPhase('running');
    cancelRef.current = false;
    try {
      const imported = await enrichRows(
        parsed.rows,
        key.trim(),
        (p) => setProgress(p),
        () => cancelRef.current,
      );
      if (cancelRef.current) {
        setPhase('idle');
        return;
      }
      await onImported(imported); // persists server-side, or browser fallback
      setResultCount(imported.length);
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
      setPhase('error');
    }
  };

  const pct = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) onClose();
          }}
        >
          <motion.div
            className="chrome-orig relative flex max-h-[88vh] w-full max-w-2xl flex-col border border-line bg-coal shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)]"
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Database size={14} className="text-blood" />
                <span className="font-display text-base tracking-[0.14em] text-bone">
                  DATA IMPORT
                </span>
                <span className="hidden font-tele text-[9px] tracking-[0.26em] text-dim sm:block">
                  IMPORT · EDIT · EXPORT — SHIPS INSIDE THE SITE
                </span>
              </div>
              <button
                onClick={onClose}
                disabled={busy}
                className="cursor-pointer p-1 text-dim transition-colors hover:text-bone disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            {/* tabs */}
            <div className="flex border-b border-line">
              {(
                [
                  ['import', 'IMPORT CSV'],
                  ['edit', 'EDIT LIBRARY'],
                ] as const
              ).map(([id, lbl]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`cursor-pointer border-b-2 px-5 py-2.5 font-tele text-[9.5px] tracking-[0.24em] transition-colors ${
                    tab === id
                      ? 'border-blood text-bone'
                      : 'border-transparent text-dim hover:text-fog'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {tab === 'edit' && <EditorPanel entries={entries} onCommit={onCommit} />}

            {tab === 'import' && (
            <>
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              {/* active library banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-ink/60 px-3 py-2">
                <span className="font-tele text-[9.5px] tracking-[0.18em] text-fog">
                  <span className={storeMode === 'server' ? 'text-blood' : ''}>
                    {MODE_LABEL[storeMode]}
                  </span>{' '}
                  · <span className="text-bone">{activeCount} TITLES</span>
                </span>
                {storeMode !== 'sample' && (
                  <button
                    onClick={onRestoreSample}
                    disabled={busy}
                    className="flex cursor-pointer items-center gap-1.5 font-tele text-[9px] tracking-[0.18em] text-dim transition-colors hover:text-bone disabled:opacity-40"
                  >
                    <RotateCcw size={10} /> RESTORE SAMPLE
                  </button>
                )}
              </div>

              {/* tmdb key */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 font-tele text-[9px] tracking-[0.28em] text-dim">
                  <KeyRound size={10} className="text-blood" /> TMDB API KEY
                </label>
                <input
                  type="password"
                  value={key}
                  disabled={busy}
                  onChange={(e) => {
                    setKey(e.target.value);
                    setTmdbKey(e.target.value.trim());
                  }}
                  placeholder="v3 key or paste CSV first — key is stored locally"
                  className={field}
                />
                <p className="mt-1.5 font-tele text-[9px] leading-relaxed tracking-[0.08em] text-dim">
                  Free at themoviedb.org/settings/api — used only from your browser to fetch
                  posters, runtimes & synopses. Never leaves this device.
                </p>
              </div>

              {/* csv input */}
              <div>
                <label className="mb-1.5 block font-tele text-[9px] tracking-[0.28em] text-dim">
                  LIBRARY CSV
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="flex cursor-pointer items-center gap-2 border border-line bg-ink/80 px-3 py-2 font-tele text-[10px] tracking-[0.16em] text-fog transition-colors hover:border-blood/60 hover:text-bone disabled:opacity-40"
                  >
                    <FileUp size={12} /> {fileName || 'CHOOSE FILE'}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                  <span className="self-center font-tele text-[9px] tracking-[0.2em] text-dim">
                    OR PASTE BELOW
                  </span>
                </div>
                <textarea
                  value={csvText}
                  disabled={busy}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    setFileName('');
                  }}
                  placeholder={'type,title,original_title,year,tvdb_id,tmdb_id,favorite,list_status,added_at,…\nmovie,Fight Club,Fight Club,1999,,550,,stopped,2020-02-15,…'}
                  className={`${field} mt-2 h-24 resize-y leading-relaxed`}
                />
                {parsed && (
                  <div className="mt-1.5 font-tele text-[9.5px] tracking-[0.16em]">
                    <span className="text-fog">{parsed.total} ROWS · </span>
                    <span className="text-bone">{parsed.rows.length} INCLUDED</span>
                    <span className="text-fog"> · {parsed.skipped} SKIPPED</span>
                    <span className="text-dim"> (for-later / hidden / unwatched)</span>
                  </div>
                )}
              </div>

              {/* progress */}
              {busy && progress && (
                <div className="border border-line bg-ink/60 px-3 py-2.5">
                  <div className="flex items-center justify-between font-tele text-[9px] tracking-[0.2em] text-fog">
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={11} className="animate-spin text-blood" />
                      ENRICHING {progress.done}/{progress.total}
                    </span>
                    <span>
                      <span className="text-bone">{progress.fetched}</span> FETCHED ·{' '}
                      <span className="text-bone">{progress.cached}</span> CACHED
                      {progress.failed > 0 && (
                        <>
                          {' '}· <span className="text-ember">{progress.failed}</span> FAILED
                        </>
                      )}
                    </span>
                  </div>
                  <div className="mt-2 h-[3px] bg-line">
                    <div
                      className="h-full bg-blood shadow-[0_0_10px_rgba(229,9,20,0.8)] transition-[width] duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {progress.current && (
                    <div className="mt-1.5 truncate font-tele text-[9px] tracking-[0.1em] text-dim">
                      ▸ {progress.current}
                    </div>
                  )}
                </div>
              )}

              {/* done / error */}
              {phase === 'done' && (
                <div className="flex items-center gap-2 border border-blood/40 bg-blood/10 px-3 py-2.5 font-tele text-[10px] tracking-[0.16em] text-bone">
                  <CheckCircle2 size={13} className="shrink-0 text-blood" />
                  {resultCount} TITLES LOADED &{' '}
                  {storeMode === 'server'
                    ? 'STORED ON SERVER — EVERY DEVICE SEES THEM.'
                    : 'STORED IN THIS BROWSER (NO SERVER DETECTED).'}{' '}
                  POSTERS STREAM FROM TMDB.
                </div>
              )}
              {(phase === 'error' || (parsed && parsed.rows.length === 0 && csvText.trim())) && (
                <div className="flex items-center gap-2 border border-ember/40 bg-ember/10 px-3 py-2.5 font-tele text-[10px] tracking-[0.14em] text-ember">
                  <AlertTriangle size={13} className="shrink-0" />
                  {error || 'NO WATCHED ROWS FOUND — CHECK list_status / added_at COLUMNS.'}
                </div>
              )}
            </div>

            {/* footer */}
            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
              <span className="font-tele text-[9px] tracking-[0.2em] text-dim">
                {busy
                  ? 'SAFE TO CLOSE? NO — CANCEL FIRST'
                  : storeMode === 'server'
                    ? 'SAVES TO YOUR SERVER · KEY STAYS LOCAL'
                    : 'NO SERVER — SAVES TO THIS BROWSER'}
              </span>
              <div className="flex gap-2">
                {busy ? (
                  <button
                    onClick={() => {
                      cancelRef.current = true;
                    }}
                    className="cursor-pointer border border-line px-4 py-2 font-tele text-[10px] tracking-[0.2em] text-fog transition-colors hover:border-ember/60 hover:text-ember"
                  >
                    CANCEL
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="cursor-pointer border border-line px-4 py-2 font-tele text-[10px] tracking-[0.2em] text-fog transition-colors hover:text-bone"
                  >
                    CLOSE
                  </button>
                )}
                <button
                  onClick={run}
                  disabled={!ready || busy}
                  className="flex cursor-pointer items-center gap-2 bg-blood px-5 py-2 font-tele text-[10px] tracking-[0.2em] text-white shadow-[0_0_20px_rgba(229,9,20,0.45)] transition-all hover:bg-ember disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
                >
                  <Upload size={12} /> IMPORT {parsed ? parsed.rows.length : ''}
                </button>
              </div>
            </div>
            </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
