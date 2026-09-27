import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Entry } from '../data/library';

/* deterministic deep tones for typographic fallback cards */
const SEEDS = ['#15131a', '#111519', '#16140f', '#101512', '#181216', '#141414'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function SeedCard({ entry }: { entry: Entry }) {
  return (
    <div
      className="poster-seed absolute inset-0 flex flex-col justify-between p-[9%] text-bone"
      style={{ background: SEEDS[hash(entry.title) % SEEDS.length] }}
    >
      <div className="font-tele text-[7px] leading-none tracking-[0.2em] text-fog">
        {entry.type === 'movie' ? 'FILM' : 'SERIES'}
        {entry.year ? ` · ${entry.year}` : ''}
      </div>
      <div>
        <div className="mb-1.5 h-px w-5 bg-blood" />
        <div className="font-display text-[clamp(13px,1.6vw,19px)] font-bold uppercase leading-[0.95] tracking-wide">
          {entry.title}
        </div>
      </div>
    </div>
  );
}

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
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <SeedCard entry={entry} />
      )}
      {entry.favorite && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-blood" aria-label="Favorite" />}
    </div>
  );
}

/* poster that springs up on hover and rises above its neighbours */
export function ZoomPoster({
  entry,
  className = '',
  posterClass = '',
  onClick,
  hoverScale = 1.8,
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
      aria-label={`${entry.title}${entry.year ? ` (${entry.year})` : ''}`}
      whileHover={{ scale: hoverScale, zIndex: 60 }}
      whileTap={{ scale: hoverScale * 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={`relative block cursor-pointer ${className}`}
      style={{ zIndex: 2 }}
    >
      <Poster entry={entry} className={`outline outline-1 -outline-offset-1 outline-white/10 ${posterClass}`} />
    </motion.button>
  );
}
