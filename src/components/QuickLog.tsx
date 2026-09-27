import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Heart, KeyRound, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { Poster } from './Poster';
import { LIBRARY, fmtDate, type Entry } from '../data/library';
import { fetchTmdbEntry, getTmdbKey, searchTmdb, setTmdbKey, type TmdbHit } from '../data/importer';
import { GIST_FILE, GIST_ID, getGithubToken, liveEnabled, setGithubToken } from '../data/live';

const field =
  'w-full border border-line bg-ink px-3 py-2 font-tele text-[11px] tracking-[0.04em] text-bone placeholder:text-dim outline-none transition-colors focus:border-rule focus-visible:outline-none';
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* Log a title you just watched: search TMDB, pick it, set the date — it is
   written to the live gist and every visitor sees it on their next load. */
export default function QuickLog({ entries, onCommit }: { entries: Entry[]; onCommit: (next: Entry[]) => Promise<void> }) {
  const [tmdbKey, setKey] = useState(getTmdbKey);
  const [token, setToken] = useState(getGithubToken);
  const [setupOpen, setSetupOpen] = useState(() => !getTmdbKey() || !getGithubToken());
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<TmdbHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [pick, setPick] = useState<TmdbHit | null>(null);
  const [date, setDate] = useState(today);
  const [fav, setFav] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef(0);

  const onLog = useMemo(() => new Set(entries.map((e) => e.id)), [entries]);
  const baked = useMemo(() => new Set(LIBRARY.map((e) => e.id)), []);
  const liveAdds = useMemo(
    () => entries.filter((e) => !baked.has(e.id)).sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
    [entries, baked],
  );

  /* debounced search */
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (q.trim().length < 2 || !tmdbKey) {
      setHits([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        setHits(await searchTmdb(q, tmdbKey));
      } catch (e) {
        setStatus({ ok: false, text: e instanceof Error ? e.message : 'Search failed.' });
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => window.clearTimeout(timer.current);
  }, [q, tmdbKey]);

  const commit = async (next: Entry[], done: string) => {
    setBusy(true);
    setStatus(null);
    try {
      await onCommit(next);
      setStatus({ ok: true, text: done });
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!pick) return;
    setBusy(true);
    try {
      const entry = await fetchTmdbEntry(pick, date, fav, tmdbKey);
      await commit([...entries.filter((e) => e.id !== entry.id), entry], `Logged ${entry.title} — live for every visitor.`);
      setPick(null);
      setQ('');
      setFav(false);
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : 'TMDB lookup failed.' });
      setBusy(false);
    }
  };

  if (!liveEnabled()) {
    return (
      <div className="space-y-4 overflow-y-auto px-5 py-5 text-[13px] leading-relaxed text-fog">
        <p className="text-bone">Live logging isn't switched on for this site yet. One-time setup:</p>
        <ol className="list-decimal space-y-2 pl-5 marker:font-tele marker:text-dim">
          <li>
            Create a gist at <span className="text-bone">gist.github.com</span> with one file named{' '}
            <code className="border border-line bg-ink px-1.5 py-0.5 font-tele text-[11px] text-bone">{GIST_FILE}</code> containing{' '}
            <code className="border border-line bg-ink px-1.5 py-0.5 font-tele text-[11px] text-bone">{'{}'}</code>. Secret or public both work.
          </li>
          <li>
            Copy the gist id (the hash in its URL) into the host's environment as{' '}
            <code className="border border-line bg-ink px-1.5 py-0.5 font-tele text-[11px] text-bone">VITE_LIBRARY_GIST_ID</code> — or into{' '}
            <code className="border border-line bg-ink px-1.5 py-0.5 font-tele text-[11px] text-bone">.env.local</code> — and deploy once.
          </li>
          <li>Come back here, add a GitHub token with the “gist” scope and your TMDB key. From then on, log from this tab.</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
      {/* setup */}
      <div className="border border-line bg-ink">
        <button
          type="button"
          onClick={() => setSetupOpen((o) => !o)}
          className="label flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-[9.5px] text-fog"
        >
          <span className="flex items-center gap-2">
            <KeyRound size={11} className="text-blood" /> Keys · stored on this device only
          </span>
          <span className={tmdbKey && token ? 'text-bone' : 'text-blood'}>{tmdbKey && token ? 'Ready' : 'Needed'}</span>
        </button>
        {setupOpen && (
          <div className="grid gap-3 border-t border-line p-3 sm:grid-cols-2">
            <label className="block">
              <span className="label mb-1 block text-[8.5px] text-dim">TMDB key (v3)</span>
              <input
                type="password"
                value={tmdbKey}
                onChange={(e) => {
                  setKey(e.target.value.trim());
                  setTmdbKey(e.target.value.trim());
                }}
                className={field}
              />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[8.5px] text-dim">GitHub token · “gist” scope</span>
              <input
                type="password"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value.trim());
                  setGithubToken(e.target.value.trim());
                }}
                className={field}
              />
            </label>
            <p className="font-tele text-[9px] leading-relaxed text-dim sm:col-span-2">
              Visitors only ever read the log. Writing needs the token, which never leaves this browser. Gist {GIST_ID.slice(0, 8)}…
            </p>
          </div>
        )}
      </div>

      {/* search */}
      <div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPick(null);
            }}
            placeholder={tmdbKey ? 'What did you just watch?' : 'Add your TMDB key above to search'}
            disabled={!tmdbKey}
            className={`${field} h-11 pl-9 text-[13px]`}
          />
          {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-dim" />}
        </div>

        {!pick && hits.length > 0 && (
          <ul className="mt-2 max-h-[34vh] overflow-y-auto border border-line">
            {hits.map((h) => {
              const id = `${h.type}-${h.tmdbId}`;
              const have = onLog.has(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setPick(h)}
                    className="flex w-full cursor-pointer items-center gap-3 border-b border-line px-3 py-2 text-left last:border-0 hover:bg-smoke"
                  >
                    <span className="aspect-[2/3] w-8 shrink-0 overflow-hidden bg-coal">
                      {h.poster && <img src={`https://image.tmdb.org/t/p/w92/${h.poster}`} alt="" className="h-full w-full object-cover" loading="lazy" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-bone">{h.title}</span>
                      <span className="label block text-[8.5px] text-dim">
                        {h.type === 'movie' ? 'Film' : 'Series'} · {h.year ?? '—'}
                      </span>
                    </span>
                    {have && <span className="label shrink-0 text-[8.5px] text-blood">On the log</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {pick && (
          <div className="mt-2 grid gap-3 border border-rule bg-ink p-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="min-w-0">
              <div className="label text-[8.5px] text-blood">{pick.type === 'movie' ? 'Film' : 'Series'} · {pick.year ?? '—'}</div>
              <div className="mt-1 truncate text-[15px] font-semibold text-bone">{pick.title}</div>
              {onLog.has(`${pick.type}-${pick.tmdbId}`) && (
                <div className="label mt-1 text-[8.5px] text-fog">Already on the log — saving updates its date.</div>
              )}
            </div>
            <label className="block">
              <span className="label mb-1 block text-[8.5px] text-dim">Watched on</span>
              <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className={field} />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFav((f) => !f)}
                aria-pressed={fav}
                aria-label="Favourite"
                className={`grid h-9 w-9 cursor-pointer place-items-center border ${fav ? 'border-blood text-blood' : 'border-line text-dim hover:text-fog'}`}
              >
                <Heart size={13} className={fav ? 'fill-blood' : ''} />
              </button>
              <button
                type="button"
                onClick={add}
                disabled={busy}
                className="label flex h-9 cursor-pointer items-center gap-2 bg-blood px-4 text-white transition-colors hover:bg-ember disabled:opacity-50"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Log it
              </button>
            </div>
          </div>
        )}
      </div>

      {status && (
        <div
          className={`flex items-center gap-2 border px-3 py-2.5 font-tele text-[10px] tracking-[0.06em] ${
            status.ok ? 'border-line text-bone' : 'border-blood/50 text-ember'
          }`}
        >
          {status.ok ? <CheckCircle2 size={13} className="shrink-0 text-blood" /> : <AlertTriangle size={13} className="shrink-0" />}
          {status.text}
        </div>
      )}

      {/* what's been logged live */}
      <div>
        <div className="label mb-2 text-[9px] text-dim">Logged since the last bake · {liveAdds.length}</div>
        {liveAdds.length === 0 ? (
          <p className="font-tele text-[10px] text-dim">Nothing yet — your next title shows up here.</p>
        ) : (
          <ul className="border border-line">
            {liveAdds.map((e) => (
              <li key={e.id} className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-0">
                <Poster entry={e} className="aspect-[2/3] w-7 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-bone">{e.title}</span>
                  <span className="label block text-[8.5px] text-dim">{fmtDate(e.addedAt)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => commit(entries.filter((x) => x.id !== e.id), `Removed ${e.title}.`)}
                  disabled={busy}
                  aria-label={`Remove ${e.title}`}
                  className="grid h-8 w-8 cursor-pointer place-items-center text-dim transition-colors hover:text-ember disabled:opacity-40"
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
