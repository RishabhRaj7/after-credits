import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';
import { Poster } from './Poster';
import { fmtDate, type Entry } from '../data/library';

/* "/" or ⌘K — find any title in the log and open its card */
export default function SearchPalette({
  open,
  entries,
  onClose,
  onPick,
}: {
  open: boolean;
  entries: Entry[];
  onClose: () => void;
  onPick: (e: Entry) => void;
}) {
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setCursor(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [...entries].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 8);
    const scored: Array<[number, Entry]> = [];
    for (const e of entries) {
      const t = e.title.toLowerCase();
      const at = t.indexOf(needle);
      if (at >= 0) scored.push([at === 0 ? 0 : t.includes(` ${needle}`) ? 1 : 2, e]);
      else if (String(e.year ?? '') === needle || (e.genres ?? []).some((g) => g.toLowerCase() === needle)) scored.push([3, e]);
    }
    return scored.sort((a, b) => a[0] - b[0] || a[1].title.localeCompare(b[1].title)).slice(0, 40).map(([, e]) => e);
  }, [q, entries]);

  useEffect(() => setCursor(0), [q]);
  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter' && results[cursor]) {
      onPick(results[cursor]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-start justify-center bg-black/80 px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Find a title"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl border border-line bg-coal"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={15} className="shrink-0 text-dim" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Title, year or genre"
                aria-controls="search-results"
                aria-activedescendant={results[cursor] ? `sr-${results[cursor].id}` : undefined}
                className="h-14 w-full bg-transparent text-base text-bone outline-none placeholder:text-dim focus-visible:outline-none"
              />
              <kbd className="label shrink-0 border border-line px-1.5 py-0.5 text-[9px] text-dim">Esc</kbd>
            </div>
            <div className="label border-b border-line px-4 py-2 text-[9px] text-dim">
              {q.trim() ? `${results.length}${results.length === 40 ? '+' : ''} matches` : 'Recently logged'}
            </div>
            <ul id="search-results" ref={listRef} role="listbox" className="max-h-[52vh] overflow-y-auto">
              {results.map((e, i) => (
                <li
                  key={e.id}
                  id={`sr-${e.id}`}
                  role="option"
                  aria-selected={i === cursor}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => onPick(e)}
                  className={`flex cursor-pointer items-center gap-3 border-l-2 px-4 py-2 ${i === cursor ? 'border-blood bg-smoke' : 'border-transparent'}`}
                >
                  <Poster entry={e} className="aspect-[2/3] w-8 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-bone">{e.title}</span>
                    <span className="label block text-[8.5px] text-dim">
                      {e.type === 'movie' ? 'Film' : 'Series'} · {e.year ?? '—'} · logged {fmtDate(e.addedAt)}
                    </span>
                  </span>
                  {i === cursor && <CornerDownLeft size={13} className="shrink-0 text-dim" />}
                </li>
              ))}
              {results.length === 0 && <li className="label px-4 py-8 text-center text-dim">Nothing on the log matches</li>}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
