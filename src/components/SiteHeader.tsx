import { ArrowUpRight } from 'lucide-react';
import Logo from './Logo';

interface Props {
  count: number;
  onJourney: () => void;
  onCollection: () => void;
  onBehind: () => void;
}

/* persistent brand bar at the very top of the page */
export default function SiteHeader({ count, onJourney, onCollection, onBehind }: Props) {
  return (
    <header className="chrome-orig relative z-30 border-b border-line bg-ink/95">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <button onClick={onJourney} className="cursor-pointer" title="After Credits — home">
          <Logo />
        </button>

        <nav className="flex items-center gap-5 sm:gap-7">
          <button
            onClick={onJourney}
            className="cursor-pointer font-tele text-[10px] tracking-[0.26em] text-bone transition-colors hover:text-blood"
          >
            THE JOURNEY
          </button>
          <button
            onClick={onCollection}
            className="group flex cursor-pointer items-center gap-2 font-tele text-[10px] tracking-[0.26em] text-dim transition-colors hover:text-bone"
          >
            THE COLLECTION
            <span className="border border-line px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-fog transition-colors group-hover:border-blood/60 group-hover:text-bone">
              {count}
            </span>
          </button>
        </nav>

        <button
          onClick={onBehind}
          className="group flex cursor-pointer items-center gap-1.5 font-tele text-[10px] tracking-[0.26em] text-dim transition-colors hover:text-bone"
        >
          <span className="hidden sm:inline">BEHIND THE SCENES</span>
          <span className="sm:hidden">BTS</span>
          <ArrowUpRight size={12} className="text-blood transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </button>
      </div>
    </header>
  );
}
