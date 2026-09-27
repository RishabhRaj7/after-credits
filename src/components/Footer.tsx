import { useState } from 'react';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import ParticleText from './ParticleText';
import { FILM_FALLBACK, LONG_EPISODE, SHORT_EPISODE } from '../data/library';

const END_CARD = [['AFTER', 'CREDITS'], ['FIN'], ['TO BE', 'CONTINUED']];

export default function Footer({ onManage, onNotes, stored }: { onManage: () => void; onNotes: () => void; stored: boolean }) {
  const [card, setCard] = useState(0);
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="label flex items-center justify-between border-b border-line py-3 text-dim">
          <span>End of reel</span>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex cursor-pointer items-center gap-2 text-fog transition-colors hover:text-bone"
          >
            Rewind <ArrowUp size={12} />
          </button>
        </div>

        <ParticleText
          shapes={END_CARD}
          index={card}
          align="center"
          onAdvance={() => setCard((c) => (c + 1) % END_CARD.length)}
          className="mx-auto mt-10 h-[clamp(160px,26vw,360px)] max-w-5xl"
        />
        <p className="label mt-4 text-center text-[9px] text-dim">Move through it · click to roll the end card</p>

        <div className="mt-16 grid gap-8 border-t border-line py-8 md:grid-cols-[1fr_auto] md:items-start">
          <p className="max-w-[80ch] font-tele text-[10px] leading-relaxed tracking-[0.04em] text-dim">
            Watched order uses the date I started each title — when a film or series was added to the log. Time
            counts each film's runtime ({FILM_FALLBACK} min when unknown) and each series' episodes ×
            episode length — {SHORT_EPISODE} min for animation and comedy, {LONG_EPISODE} min for
            everything else, when TMDB has no figure. Series still airing, or dropped part-way, can
            over- or under-count.
          </p>
          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex gap-6">
              <button type="button" onClick={onNotes} className="label cursor-pointer text-fog transition-colors hover:text-bone">
                Notes
              </button>
              <button type="button" onClick={onManage} className="label cursor-pointer text-fog transition-colors hover:text-bone">
                {stored ? 'Manage data' : 'Import data'}
              </button>
            </div>
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noreferrer"
              className="label flex items-center gap-1 text-[9px] text-dim transition-colors hover:text-bone"
            >
              Metadata & posters via TMDB <ArrowUpRight size={10} className="text-blood" />
            </a>
            <span className="font-tele text-[8.5px] text-dim">This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
