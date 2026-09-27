import { useState } from 'react';
import { motion, type MotionValue } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { DecadeStat, Dir, Order, TypeFilter, YearGroup } from '../data/library';

export type ViewId = 'burst' | 'reel';

export const VIEW_META: Record<ViewId, { num: string; label: string; blurb: string }> = {
  burst: { num: '01', label: 'Cluster & Burst', blurb: 'The log as a winding track. Quiet nights coast past; binge weeks knot up and burst open.' },
  reel: { num: '02', label: 'The Reel', blurb: 'Every title in line, year by year. The spine thickens where the attention did.' },
};

/* ── projection chooser: the section's headline doubles as its tabs ─────── */

export function ProjectionTabs({ view, onSwitch }: { view: ViewId; onSwitch: (v: ViewId) => void }) {
  return (
    <div className="grid border-t border-line sm:grid-cols-2" role="tablist" aria-label="Projection">
      {(Object.keys(VIEW_META) as ViewId[]).map((id) => {
        const m = VIEW_META[id];
        const on = view === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSwitch(id)}
            className={`group relative cursor-pointer border-b border-line py-6 text-left sm:py-8 ${id === 'reel' ? 'sm:border-l sm:pl-8' : 'sm:pr-8'}`}
          >
            {on && <motion.span layoutId="projection-edge" className="absolute inset-x-0 top-[-1px] h-px bg-blood" />}
            <div className={`label flex items-center gap-3 ${on ? 'text-blood' : 'text-dim'}`}>
              View {m.num}
              <span className={on ? 'text-fog' : 'text-dim opacity-0 transition-opacity group-hover:opacity-100'}>
                {on ? '— now showing' : '— cut to'}
              </span>
            </div>
            <div
              className={`mt-2 font-display text-[clamp(40px,5.6vw,84px)] font-extrabold uppercase leading-[0.88] transition-colors ${
                on ? 'text-bone' : 'text-rule group-hover:text-fog'
              }`}
            >
              {m.label}
            </div>
            <p className={`mt-3 max-w-[46ch] text-sm leading-relaxed ${on ? 'text-fog' : 'text-dim'}`}>{m.blurb}</p>
          </button>
        );
      })}
    </div>
  );
}

/* ── segmented control ─────────────────────────────────────────────────── */

function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
  stacked = false,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (v: T) => void;
  /** full-width row with its label above (the phone filter panel) */
  stacked?: boolean;
}) {
  return (
    <div className={stacked ? 'grid gap-1.5' : 'flex shrink-0 items-center gap-2.5'} role="group" aria-label={label}>
      <span className={`label text-[9px] text-dim ${stacked ? '' : 'hidden xl:inline'}`}>{label}</span>
      <div className="flex border border-line">
        {options.map(([k, text], i) => (
          <button
            key={k}
            type="button"
            aria-pressed={value === k}
            onClick={() => onChange(k)}
            className={`label cursor-pointer text-[9.5px] transition-colors ${stacked ? 'h-10 flex-1' : 'h-8 px-3'} ${i ? 'border-l border-line' : ''} ${
              value === k ? 'bg-bone text-ink' : 'text-fog hover:bg-smoke hover:text-bone'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── sticky deck ───────────────────────────────────────────────────────── */

interface DeckProps {
  view: ViewId;
  onSwitch: (v: ViewId) => void;
  order: Order;
  onOrder: (o: Order) => void;
  dir: Dir;
  onDir: (d: Dir) => void;
  typeFilter: TypeFilter;
  onTypeFilter: (t: TypeFilter) => void;
  groups: YearGroup[];
  decades: DecadeStat[];
  hidden: Set<number>;
  onToggleYear: (y: number) => void;
  onToggleDecade: (d: number) => void;
  onAll: () => void;
  onSearch: () => void;
  progress: MotionValue<number>;
}

const chip = 'label shrink-0 cursor-pointer border px-2.5 text-[9.5px] tracking-[0.1em] transition-colors';

function YearChips(p: DeckProps & { wrap?: boolean }) {
  const h = p.wrap ? 'h-9' : 'h-7';
  return (
    <>
      {p.decades.map((d) => {
        const allIn = d.years.every((y) => !p.hidden.has(y));
        return (
          <button
            key={d.decade}
            type="button"
            aria-pressed={allIn}
            onClick={() => p.onToggleDecade(d.decade)}
            className={`${chip} ${h} ${allIn ? 'border-rule text-bone' : 'border-line text-dim hover:text-fog'}`}
          >
            {d.decade}s
          </button>
        );
      })}
      {!p.wrap && <span className="mx-1.5 h-4 w-px shrink-0 bg-line" />}
      {p.groups.map((g) => {
        const off = p.hidden.has(g.year);
        return (
          <button
            key={g.year}
            type="button"
            aria-pressed={!off}
            title={`${g.items.length} titles`}
            onClick={() => p.onToggleYear(g.year)}
            className={`${chip} ${h} ${off ? 'border-line/50 text-dim line-through decoration-dim' : 'border-line text-bone hover:border-rule'}`}
          >
            {g.year} <span className={off ? 'text-dim' : 'text-blood'}>{g.items.length}</span>
          </button>
        );
      })}
    </>
  );
}

export default function ControlDeck(p: DeckProps) {
  const [open, setOpen] = useState(false);
  const visible = p.groups.reduce((s, g) => s + (p.hidden.has(g.year) ? 0 : g.items.length), 0);
  const total = p.groups.reduce((s, g) => s + g.items.length, 0);
  const active =
    (p.order !== 'watch' ? 1 : 0) + (p.dir !== 'asc' ? 1 : 0) + (p.typeFilter !== 'all' ? 1 : 0) + (p.hidden.size ? 1 : 0);

  return (
    <div className="sticky top-0 z-40 border-b border-line bg-ink">
      {/* ── phones: compact bar, filters stacked in a panel ── */}
      <div className="px-4 md:hidden">
        <div className="flex h-14 items-center gap-2">
          <Seg label="View" value={p.view} onChange={p.onSwitch} options={[['burst', 'Burst'], ['reel', 'Reel']]} />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="deck-filters"
            className={`label ml-auto flex h-8 cursor-pointer items-center gap-2 border px-3 text-[9.5px] ${open ? 'border-bone text-bone' : 'border-line text-fog'}`}
          >
            <SlidersHorizontal size={12} /> Filters
            {active > 0 && <span className="grid h-4 min-w-4 place-items-center bg-blood px-1 text-[9px] text-white">{active}</span>}
          </button>
          <button
            type="button"
            onClick={p.onSearch}
            aria-label="Find a title"
            className="grid h-8 w-8 cursor-pointer place-items-center border border-line text-fog"
          >
            <Search size={13} />
          </button>
        </div>
        {open && (
          <div id="deck-filters" className="max-h-[70vh] space-y-4 overflow-y-auto overscroll-contain border-t border-line py-4">
            <Seg stacked label="Sequence" value={p.order} onChange={p.onOrder} options={[['watch', 'Watched'], ['release', 'Released']]} />
            <Seg stacked label="Direction" value={p.dir} onChange={p.onDir} options={[['asc', 'Oldest first'], ['desc', 'Newest first']]} />
            <Seg stacked label="Type" value={p.typeFilter} onChange={p.onTypeFilter} options={[['all', 'All'], ['movie', 'Films'], ['show', 'Series']]} />
            <div className="grid gap-1.5">
              <span className="label text-[9px] text-dim">
                Years · showing <span className="text-bone">{visible}</span>/{total}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <YearChips {...p} wrap />
              </div>
            </div>
            <div className="flex gap-2">
              {p.hidden.size > 0 && (
                <button type="button" onClick={p.onAll} className="label h-10 flex-1 cursor-pointer border border-blood/60 text-bone">
                  Reset years
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="label h-10 flex-1 cursor-pointer bg-bone text-ink">
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── tablets and up: two strips ── */}
      <div className="mx-auto hidden max-w-[1600px] px-4 sm:px-8 md:block">
        <div className="strip flex h-14 items-center gap-3 sm:gap-5">
          <Seg label="View" value={p.view} onChange={p.onSwitch} options={[['burst', 'Burst'], ['reel', 'Reel']]} />
          <Seg label="Sequence" value={p.order} onChange={p.onOrder} options={[['watch', 'Watched'], ['release', 'Released']]} />
          <Seg label="Direction" value={p.dir} onChange={p.onDir} options={[['asc', 'Oldest'], ['desc', 'Newest']]} />
          <Seg label="Type" value={p.typeFilter} onChange={p.onTypeFilter} options={[['all', 'All'], ['movie', 'Films'], ['show', 'Series']]} />
          <button
            type="button"
            onClick={p.onSearch}
            className="label ml-auto flex h-8 shrink-0 cursor-pointer items-center gap-2 border border-line px-3 text-[9.5px] text-fog transition-colors hover:border-rule hover:text-bone"
          >
            <Search size={12} /> Find a title
            <kbd className="border border-line px-1 font-tele text-[9px] text-dim">/</kbd>
          </button>
        </div>

        <div className="strip -mx-4 flex h-11 items-center gap-1.5 border-t border-line px-4 sm:-mx-8 sm:px-8">
          <YearChips {...p} />
          {p.hidden.size > 0 && (
            <button type="button" onClick={p.onAll} className={`${chip} h-7 border-blood/60 text-bone hover:bg-blood hover:text-white`}>
              Reset
            </button>
          )}
          <span className="label ml-auto hidden shrink-0 pl-4 text-[9px] text-dim lg:inline">
            Showing <span className="text-bone">{visible}</span>/{total}
          </span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[-1px] h-px">
        <motion.div className="h-full origin-left bg-blood" style={{ scaleX: p.progress }} />
      </div>
    </div>
  );
}
