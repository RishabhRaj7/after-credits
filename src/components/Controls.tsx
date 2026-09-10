import { useId } from 'react';
import { motion, type MotionValue } from 'framer-motion';
import { History, CalendarClock, Waypoints, GalleryVertical, CircleDot, ArrowRight, Upload } from 'lucide-react';
import type { LibraryStats, Order } from '../data/library';

export type ViewId = 'burst' | 'reel';
export const VIEW_META: Record<ViewId, { label: string; alias: string; blurb: string }> = {
  burst: { label: 'CLUSTER & BURST', alias: 'THE BINGE MAP', blurb: 'The timeline as terrain. Quiet months coast, binge weeks detonate.' },
  reel: { label: 'THE REEL', alias: 'YEAR BY YEAR', blurb: 'A spine, an odometer, every title in line. Scrub your own history.' },
};

/* ── order toggle ──────────────────────────────────────────────────────── */

interface OrderProps {
  order: Order;
  onChange: (o: Order) => void;
  compact?: boolean;
}

export function OrderToggle({ order, onChange, compact = false }: OrderProps) {
  const id = useId();
  const opts: { key: Order; label: string; icon: typeof History; hint: string }[] = [
    { key: 'watch', label: 'WATCHED ORDER', icon: History, hint: 'in the order I saw them' },
    { key: 'release', label: 'RELEASE ORDER', icon: CalendarClock, hint: 'by premiere date' },
  ];
  return (
    <div className="flex flex-col gap-2">
      {!compact && (
        <span className="font-tele text-[10px] tracking-[0.3em] text-dim uppercase">SEQUENCE</span>
      )}
      <div className="relative flex rounded-full border border-line bg-coal/90 p-1">
        {opts.map(({ key, label, icon: Icon }) => {
          const active = order === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`relative z-10 flex items-center gap-2 rounded-full px-4 py-2 font-tele text-[10px] tracking-[0.18em] transition-colors duration-200 sm:text-[11px] ${
                active ? 'text-white' : 'text-fog hover:text-bone'
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`order-pill-${id}`}
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                  className="absolute inset-0 -z-10 rounded-full bg-blood shadow-[0_0_18px_rgba(229,9,20,0.5)]"
                />
              )}
              <Icon size={13} strokeWidth={2.4} />
              {compact ? (key === 'watch' ? 'WATCHED' : 'RELEASE') : label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── view switcher (hero edition) ──────────────────────────────────────── */

interface SwitchProps {
  view: ViewId;
  onSwitch: (v: ViewId) => void;
}

export function ViewSwitcher({ view, onSwitch }: SwitchProps) {
  const ids: ViewId[] = ['burst', 'reel'];
  return (
    <div className="flex flex-col gap-2">
      <span className="font-tele text-[10px] tracking-[0.3em] text-dim uppercase">PROJECTION</span>
      <div className="grid gap-3 sm:grid-cols-2">
        {ids.map((id, i) => {
          const m = VIEW_META[id];
          const active = view === id;
          const Icon = id === 'burst' ? Waypoints : GalleryVertical;
          return (
            <button
              key={id}
              onClick={() => onSwitch(id)}
              className={`group relative overflow-hidden border p-4 text-left transition-colors duration-300 sm:p-5 ${
                active
                  ? 'border-blood/80 bg-smoke'
                  : 'border-line bg-coal/60 hover:border-fog/60 hover:bg-smoke/60'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="view-active-edge"
                  className="absolute inset-y-0 left-0 w-[3px] bg-blood shadow-[0_0_16px_rgba(229,9,20,0.8)]"
                />
              )}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-tele text-[10px] tracking-[0.28em] text-dim">
                    VIEW {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="mt-1 font-display text-xl uppercase tracking-wide text-bone sm:text-2xl">
                    {m.label}
                  </div>
                  <div className="mt-1.5 max-w-[26ch] text-xs leading-relaxed text-fog">{m.blurb}</div>
                </div>
                <Icon size={26} strokeWidth={1.6} className={active ? 'text-blood' : 'text-dim group-hover:text-fog'} />
              </div>
              <div className={`mt-3 flex items-center gap-2 font-tele text-[10px] tracking-[0.22em] ${active ? 'text-blood' : 'text-dim group-hover:text-bone'}`}>
                {active ? (
                  <>
                    <CircleDot size={11} className="rec-dot" />
                    NOW SHOWING
                  </>
                ) : (
                  <>
                    CUT TO
                    <ArrowRight size={11} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── sticky top bar (post-hero) ────────────────────────────────────────── */

interface BarProps {
  order: Order;
  view: ViewId;
  onOrder: (o: Order) => void;
  onSwitch: (v: ViewId) => void;
  onImport: () => void;
  stats: LibraryStats;
  progress: MotionValue<number>; // page scroll — rendered as a seek hairline
}

export function TopBar({ order, view, onOrder, onSwitch, onImport, stats, progress }: BarProps) {
  return (
    <motion.header
      initial={{ y: -72 }}
      animate={{ y: 0 }}
      exit={{ y: -72 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="chrome-orig fixed inset-x-0 top-0 z-[70] border-b border-line bg-ink/85 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="block h-4 w-4 bg-blood shadow-[0_0_12px_rgba(229,9,20,0.7)]" />
          <span className="font-display text-sm tracking-[0.12em] text-bone">WATCH LOG</span>
          <span className="hidden font-tele text-[10px] tracking-[0.2em] text-dim md:block">
            — {stats.days}D {String(stats.hours).padStart(2, '0')}H ON RECORD
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onImport}
            title="Import your CSV"
            className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 font-tele text-[10px] tracking-[0.16em] text-fog transition-colors hover:border-blood/70 hover:text-bone"
          >
            <Upload size={12} strokeWidth={2.2} />
            <span className="hidden sm:inline">IMPORT</span>
          </button>
          <OrderToggle order={order} onChange={onOrder} compact />
          <div className="hidden items-center gap-1 sm:flex">
            {(['burst', 'reel'] as ViewId[]).map((id) => {
              const Icon = id === 'burst' ? Waypoints : GalleryVertical;
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => onSwitch(id)}
                  title={VIEW_META[id].label}
                  className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 font-tele text-[10px] tracking-[0.16em] transition-colors ${
                    active ? 'bg-blood text-white' : 'text-fog hover:bg-smoke hover:text-bone'
                  }`}
                >
                  <Icon size={13} strokeWidth={2.2} />
                  {id === 'burst' ? 'BURST' : 'REEL'}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[-1px] h-[2px] bg-smoke">
        <motion.div className="h-full origin-left bg-blood" style={{ scaleX: progress }} />
      </div>
    </motion.header>
  );
}
