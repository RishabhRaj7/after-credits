import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import Logo from './Logo';

interface Props {
  count: number;
  onJourney: () => void;
  onCollection: () => void;
  onBehind: () => void;
}

/* Desktop chrome is unchanged; narrow screens get a disclosure navigation. */
export default function SiteHeader({ count, onJourney, onCollection, onBehind }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);
  const navigate = (action: () => void) => { setMenuOpen(false); requestAnimationFrame(action); };

  return (
    <header className="site-header chrome-orig relative z-30 border-b border-line bg-ink/95">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <button onClick={onJourney} className="cursor-pointer" title="After Credits — home">
          <Logo />
        </button>
        <nav className="desktop-nav flex items-center gap-5 sm:gap-7" aria-label="Main navigation">
          <button onClick={onJourney} className="cursor-pointer font-tele text-[10px] tracking-[0.26em] text-bone transition-colors hover:text-blood">THE JOURNEY</button>
          <button onClick={onCollection} className="group flex cursor-pointer items-center gap-2 font-tele text-[10px] tracking-[0.26em] text-dim transition-colors hover:text-bone">
            THE COLLECTION
            <span className="border border-line px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-fog transition-colors group-hover:border-blood/60 group-hover:text-bone">{count}</span>
          </button>
        </nav>
        <button onClick={onBehind} className="desktop-behind group flex cursor-pointer items-center gap-1.5 font-tele text-[10px] tracking-[0.26em] text-dim transition-colors hover:text-bone">
          <span className="hidden sm:inline">BEHIND THE SCENES</span>
          <span className="sm:hidden">BTS</span>
          <ArrowUpRight size={12} className="text-blood transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </button>
        <button ref={toggleRef} type="button" className="mobile-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && (
        <nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation">
          <button onClick={() => navigate(onJourney)}>THE JOURNEY <ArrowUpRight size={14} /></button>
          <button onClick={() => navigate(onCollection)}>THE COLLECTION <span>{count}</span></button>
          <button onClick={() => navigate(onBehind)}>BEHIND THE SCENES <ArrowUpRight size={14} /></button>
        </nav>
      )}
    </header>
  );
}
