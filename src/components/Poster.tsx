import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Film, Tv } from 'lucide-react';
import {
  paletteOf, serialOf, posterUrl, factLine, type Entry,
} from '../data/library';

/**
 * Poster system. Every entry renders something poster-like:
 *   • TMDB poster if the library was enriched with a key,
 *   • otherwise a deterministic typographic title card (each title hashes to
 *     one of eight art-directed dark-cinema palettes).
 * Both treatments share frame, ratio and hover physics.
 */

export function FallbackCard({ entry }: { entry: Entry }) {
  const p = paletteOf(entry.title + entry.id);
  const long = entry.title.length > 24;
  return (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden"
      style={{
        containerType: 'inline-size',
        background: `linear-gradient(158deg, ${p.edge} 0%, ${p.bg} 46%, ${p.bg} 100%)`,
        color: p.ink,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at 30% 18%, ${p.glow}, transparent 60%)` }}
      />
      <div className="scanlines pointer-events-none absolute inset-0" />
      <div className="relative flex items-center justify-between px-[9%] pt-[8%] font-tele uppercase" style={{ fontSize: '8.2cqw', letterSpacing: '0.14em', opacity: 0.75 }}>
        <span className="flex items-center gap-[1.2cqw]">
          {entry.type === 'movie' ? <Film size={'9cqw' as never} strokeWidth={2.4} className="!h-[9cqw] !w-[9cqw]" /> : <Tv className="!h-[9cqw] !w-[9cqw]" strokeWidth={2.4} />}
          {entry.type === 'movie' ? 'FILM' : 'SERIES'}
        </span>
        <span>{entry.year ?? '––––'}</span>
      </div>
      <div className="relative px-[9%]">
        <div
          className="font-display uppercase leading-[0.92] tracking-[0.01em]"
          style={{ fontSize: long ? '11cqw' : '15cqw' }}
        >
          {entry.title}
        </div>
      </div>
      <div className="relative flex items-end justify-between px-[9%] pb-[8%] font-tele uppercase" style={{ fontSize: '7.4cqw', letterSpacing: '0.1em', opacity: 0.7 }}>
        <span>{factLine(entry)}</span>
        <span>№{serialOf(entry.id)}</span>
      </div>
      {entry.favorite && (
        <div className="absolute right-[8%] top-[26%]">
          <Star className="!h-[10cqw] !w-[10cqw] fill-blood text-blood" strokeWidth={0} style={{ filter: 'drop-shadow(0 0 6px rgba(229,9,20,.8))' }} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 border border-white/10" />
    </div>
  );
}

export function PosterArt({ entry, eager = false }: { entry: Entry; eager?: boolean }) {
  const src = posterUrl(entry.posterPath);
  const [errored, setErrored] = useState(false);
  if (!src || errored) return <FallbackCard entry={entry} />;
  return (
    <img
      src={src}
      alt={entry.title}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onError={() => setErrored(true)}
      className="h-full w-full select-none object-cover"
    />
  );
}

interface ZoomProps {
  entry: Entry;
  className?: string;
  eager?: boolean;
  zoom?: number;
  onSelect?: (e: Entry) => void;
}

/**
 * The shared poster interaction, per spec: ~2× spring scale, lifted shadow,
 * z-index above neighbours, click opens the detail panel.
 */
export function ZoomPoster({ entry, className = '', eager = false, zoom = 2.02, onSelect }: ZoomProps) {
  return (
    <motion.div
      whileHover={{ scale: zoom, zIndex: 60 }}
      transition={{ type: 'spring', stiffness: 320, damping: 21 }}
      className={`relative aspect-[2/3] cursor-pointer overflow-hidden rounded-[3px] bg-coal shadow-[0_2px_10px_rgba(0,0,0,0.5)] hover:z-[60] hover:shadow-[0_22px_44px_rgba(0,0,0,0.72)] ${className}`}
      onClick={(e) => { e.stopPropagation(); onSelect?.(entry); }}
      role="button"
      aria-label={entry.title}
      title={entry.title}
    >
      <PosterArt entry={entry} eager={eager} />
    </motion.div>
  );
}
