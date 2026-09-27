import { useState } from 'react';
import { Menu, Plus, Search, X } from 'lucide-react';
import Logo from './Logo';

interface Props {
  count: number;
  onTop: () => void;
  onLog: () => void;
  onAlmanac: () => void;
  onNotes: () => void;
  onSearch: () => void;
  onData: () => void;
}

export default function SiteHeader({ count, onTop, onLog, onAlmanac, onNotes, onSearch, onData }: Props) {
  const [open, setOpen] = useState(false);
  const links: Array<[string, () => void]> = [
    ['Almanac', onAlmanac],
    ['The log', onLog],
    ['Notes', onNotes],
  ];
  const go = (fn: () => void) => {
    setOpen(false);
    requestAnimationFrame(fn);
  };

  return (
    <header className="relative z-30 border-b border-line bg-ink">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-8">
        <button type="button" onClick={onTop} className="cursor-pointer" aria-label="After Credits — top">
          <Logo />
        </button>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {links.map(([label, fn], i) => (
            <button key={label} type="button" onClick={fn} className="label group flex cursor-pointer items-center gap-2 text-fog transition-colors hover:text-bone">
              <span className="text-dim transition-colors group-hover:text-blood">0{i + 1}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="label hidden text-[9.5px] text-dim xl:inline">{count} titles on record</span>
          <button
            type="button"
            onClick={onData}
            className="label flex h-9 cursor-pointer items-center gap-2 border border-line px-3 text-[9.5px] text-fog transition-colors hover:border-blood hover:text-bone"
          >
            <Plus size={13} className="text-blood" />
            <span className="hidden sm:inline">Log a title</span>
          </button>
          <button
            type="button"
            onClick={onSearch}
            aria-label="Find a title"
            className="grid h-9 w-9 cursor-pointer place-items-center border border-line text-fog transition-colors hover:border-rule hover:text-bone"
          >
            <Search size={14} />
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid h-9 w-9 cursor-pointer place-items-center border border-line text-fog md:hidden"
          >
            {open ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" className="border-t border-line px-4 pb-2 md:hidden" aria-label="Mobile">
          {links.map(([label, fn], i) => (
            <button key={label} type="button" onClick={() => go(fn)} className="label flex h-12 w-full cursor-pointer items-center gap-3 border-b border-line text-left text-bone last:border-0">
              <span className="text-blood">0{i + 1}</span>
              {label}
            </button>
          ))}
          <button type="button" onClick={() => go(onData)} className="label flex h-12 w-full cursor-pointer items-center gap-3 text-left text-bone">
            <span className="text-blood">04</span>
            Log a title · manage data
          </button>
        </nav>
      )}
    </header>
  );
}
