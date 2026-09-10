import { useMemo, useState } from 'react';
import { ChevronDown, Download, Heart, Pencil, Save, Search, Trash2 } from 'lucide-react';
import { Poster } from './Poster';
import { fmtDur, watchMinutes, type Entry } from '../data/library';

interface Props {
  entries: Entry[];
  onCommit: (next: Entry[]) => Promise<void>;
}

const input =
  'w-full border border-line bg-ink/80 px-2.5 py-1.5 font-tele text-[11px] text-bone outline-none transition-colors focus:border-blood/70';
const label = 'mb-1 block font-tele text-[8.5px] tracking-[0.24em] text-dim';

/* one expandable row — edits commit straight into the active library */
function EditRow({
  entry,
  onDelete,
  onSave,
}: {
  entry: Entry;
  onDelete: () => void;
  onSave: (e: Entry) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Entry>(entry);
  const [confirmDel, setConfirmDel] = useState(false);
  const [saving, setSaving] = useState(false);
  const isMovie = draft.type === 'movie';

  const set = <K extends keyof Entry>(k: K, v: Entry[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="border-b border-line/70">
      <button
        onClick={() => {
          setOpen((o) => !o);
          setDraft(entry);
          setConfirmDel(false);
        }}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="aspect-[2/3] w-8 shrink-0 overflow-hidden">
          <Poster entry={entry} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[13px] font-semibold text-bone">{entry.title}</span>
            {entry.favorite && <Heart size={9} className="shrink-0 fill-blood text-blood" />}
          </div>
          <div className="mt-0.5 font-tele text-[8.5px] tracking-[0.16em] text-dim">
            {entry.type === 'movie' ? 'FILM' : 'SERIES'} · {entry.year ?? '—'} · LOGGED {entry.addedAt} ·{' '}
            {fmtDur(watchMinutes(entry))}
          </div>
        </div>
        <Pencil size={11} className="shrink-0 text-dim" />
        <ChevronDown
          size={13}
          className={`shrink-0 text-dim transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-3 bg-ink/50 px-3 py-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="col-span-2">
              <label className={label}>TITLE</label>
              <input className={input} value={draft.title} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div>
              <label className={label}>YEAR</label>
              <input
                className={input}
                type="number"
                value={draft.year ?? ''}
                onChange={(e) => set('year', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className={label}>TYPE</label>
              <select
                className={input}
                value={draft.type}
                onChange={(e) => set('type', e.target.value as Entry['type'])}
              >
                <option value="movie">movie</option>
                <option value="show">show</option>
              </select>
            </div>
            <div>
              <label className={label}>DATE LOGGED</label>
              <input
                className={input}
                type="date"
                value={draft.addedAt}
                onChange={(e) => set('addedAt', e.target.value)}
              />
            </div>
            {isMovie ? (
              <div>
                <label className={label}>RUNTIME (MIN)</label>
                <input
                  className={input}
                  type="number"
                  value={draft.runtimeMinutes ?? ''}
                  onChange={(e) => set('runtimeMinutes', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className={label}>EPISODES</label>
                  <input
                    className={input}
                    type="number"
                    value={draft.episodes ?? ''}
                    onChange={(e) => set('episodes', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <label className={label}>EP RUNTIME</label>
                  <input
                    className={input}
                    type="number"
                    value={draft.episodeRuntime ?? ''}
                    onChange={(e) => set('episodeRuntime', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </>
            )}
            <div className="flex items-end">
              <button
                onClick={() => set('favorite', !draft.favorite ? true : undefined)}
                className={`flex w-full cursor-pointer items-center justify-center gap-1.5 border px-2 py-1.5 font-tele text-[9px] tracking-[0.2em] transition-colors ${
                  draft.favorite
                    ? 'border-blood/70 bg-blood/15 text-blood'
                    : 'border-line text-dim hover:text-fog'
                }`}
              >
                <Heart size={10} className={draft.favorite ? 'fill-blood' : ''} /> FAV
              </button>
            </div>
          </div>
          <div>
            <label className={label}>SYNOPSIS</label>
            <textarea
              className={`${input} h-16 resize-y leading-relaxed`}
              value={draft.overview ?? ''}
              onChange={(e) => set('overview', e.target.value || undefined)}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => {
                if (confirmDel) onDelete();
                else setConfirmDel(true);
              }}
              className={`flex cursor-pointer items-center gap-1.5 border px-2.5 py-1.5 font-tele text-[9px] tracking-[0.18em] transition-colors ${
                confirmDel
                  ? 'border-ember bg-ember/15 text-ember'
                  : 'border-line text-dim hover:border-ember/60 hover:text-ember'
              }`}
            >
              <Trash2 size={10} /> {confirmDel ? 'CONFIRM DELETE' : 'DELETE'}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="cursor-pointer border border-line px-3 py-1.5 font-tele text-[9px] tracking-[0.18em] text-dim transition-colors hover:text-bone"
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  setSaving(true);
                  await onSave({ ...draft, title: draft.title.trim() || entry.title });
                  setSaving(false);
                  setOpen(false);
                }}
                disabled={saving}
                className="flex cursor-pointer items-center gap-1.5 bg-blood px-3 py-1.5 font-tele text-[9px] tracking-[0.18em] text-white transition-colors hover:bg-ember disabled:opacity-50"
              >
                <Save size={10} /> {saving ? 'SAVING' : 'SAVE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditorPanel({ entries, onCommit }: Props) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(
      (e) => e.title.toLowerCase().includes(needle) || String(e.year ?? '').includes(needle),
    );
  }, [entries, q]);

  const commit = async (next: Entry[]) => {
    await onCommit(next);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'baked-library.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="editor-panel flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SEARCH TITLE OR YEAR"
            className={`${input} pl-7`}
          />
        </div>
        <span className="shrink-0 font-tele text-[9px] tracking-[0.18em] text-dim">
          {filtered.length}/{entries.length}
        </span>
        <button
          onClick={exportJson}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 border border-blood/60 bg-blood/10 px-3 py-1.5 font-tele text-[9px] tracking-[0.18em] text-bone transition-colors hover:bg-blood/25"
        >
          <Download size={11} className="text-blood" /> EXPORT JSON
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.map((e) => (
          <EditRow
            key={e.id}
            entry={e}
            onSave={async (next) => commit(entries.map((x) => (x.id === e.id ? next : x)))}
            onDelete={() => commit(entries.filter((x) => x.id !== e.id))}
          />
        ))}
        {filtered.length === 0 && (
          <div className="py-10 text-center font-tele text-[10px] tracking-[0.2em] text-dim">
            NO MATCHES
          </div>
        )}
      </div>

      <div className="border-t border-line px-5 py-2.5 font-tele text-[8.5px] leading-relaxed tracking-[0.14em] text-dim">
        FIX A MISTAKE → SAVE. THEN <span className="text-blood">EXPORT JSON</span> AND REPLACE{' '}
        <span className="text-bone">data/baked-library.json</span> IN YOUR REPO — COMMIT TO PUBLISH.
      </div>
    </div>
  );
}
