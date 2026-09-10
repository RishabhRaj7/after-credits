import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import type { Entry } from '../data/library';

/* deterministic deep palette for typographic fallback cards */
const SEEDS: Array<[string, string]> = [
  ['#171114', '#e8ddd0'],
  ['#101418', '#dfe5ea'],
  ['#16140f', '#ece4d2'],
  ['#0f1713', '#dcebe0'],
  ['#170f16', '#e9dcea'],
  ['#131313', '#e6e6e6'],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function SeedCard({ entry }: { entry: Entry }) {
  const [bg, fg] = SEEDS[hash(entry.title) % SEEDS.length];
  const words = entry.title.toUpperCase().split(' ');
  return (
    <div
      className="poster-seed absolute inset-0 flex flex-col justify-between p-[9%]"
      style={{ background: bg, color: fg }}
    >
      <div className="font-tele text-[7px] leading-none tracking-[0.22em] opacity-60">
        {entry.type === 'movie' ? 'A FILM' : 'A SERIES'}
        {entry.year ? ` · ${entry.year}` : ''}
      </div>
      <div>
        <div className="mb-1.5 h-px w-5 bg-blood" />
        <div className="font-display text-[clamp(13px,1.6vw,19px)] uppercase leading-[0.92] tracking-wide">
          {words.join(' ')}
        </div>
      </div>
      <div className="font-tele text-[6.5px] tracking-[0.3em] opacity-40">AFTER CREDITS</div>
    </div>
  );
}

/* original header refers to the bare art layer by this name */
export const PosterArt = Poster;

/* bare TMDB ids become CDN urls; baked entries carry local paths like
   "posters/x.jpg" (or full urls) and are used verbatim */
export function posterSrc(poster: string): string {
  return poster.includes('/') || poster.startsWith('http')
    ? poster
    : `https://image.tmdb.org/t/p/w500/${poster}.jpg`;
}

export function Poster({ entry, className = '' }: { entry: Entry; className?: string }) {
  const [broken, setBroken] = useState(false);
  const showImg = !!entry.poster && !broken;
  return (
    <div className={`relative overflow-hidden bg-coal ${className}`}>
      {showImg ? (
        <img
          src={posterSrc(entry.poster!)}
          alt={entry.title}
          loading="lazy"
          draggable={false}
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <SeedCard entry={entry} />
      )}
      {showImg && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
      )}
      {entry.favorite && (
        <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 backdrop-blur-sm">
          <Heart size={10} className="fill-blood text-blood" />
        </div>
      )}
    </div>
  );
}

/* poster that springs up ~2× on hover and yields its neighbors */
export function ZoomPoster({
  entry,
  className = '',
  posterClass = '',
  onClick,
  hoverScale = 1.9,
}: {
  entry: Entry;
  className?: string;
  posterClass?: string;
  onClick?: (e: Entry) => void;
  hoverScale?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick?.(entry)}
      whileHover={{ scale: hoverScale, zIndex: 60 }}
      whileTap={{ scale: hoverScale * 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={`relative block cursor-pointer outline-none ${className}`}
      style={{ zIndex: 2 }}
    >
      <Poster
        entry={entry}
        className={`shadow-[0_18px_40px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/10 ${posterClass}`}
      />
    </motion.button>
  );
}
