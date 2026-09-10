import { Fragment } from 'react';
import { Poster } from '../components/Poster';
import { fmtDur, fmtMonth, headlineFor, intensityFor, type Cluster, type Entry } from '../data/library';

/* Only mounted below the desktop timeline breakpoint. Natural document flow
   keeps captions clear of the art; native scrolling makes every poster reachable. */
export default function MobileTrack({ clusters, onSelect }: {
  clusters: Cluster[];
  onSelect: (entry: Entry) => void;
}) {
  return (
    <div className="mobile-track">
      {clusters.map((cluster, index) => {
        const year = new Date(cluster.startTs).getFullYear();
        const previousYear = index ? new Date(clusters[index - 1].startTs).getFullYear() : null;
        const intensity = intensityFor(cluster.items.length);
        return (
          <Fragment key={`${cluster.startTs}-${index}`}>
            {year !== previousYear && (
              <div className="mobile-track-year">
                <span className="font-display">{year}</span>
                <span className="font-tele">A NEW CHAPTER</span>
              </div>
            )}
            <section className="mobile-cluster" aria-label={`${fmtMonth(cluster.startTs)}, ${cluster.items.length} stories`}>
              <div className="mobile-cluster-dot" />
              <div className="font-tele text-[10px] tracking-[0.18em] text-fog">{fmtMonth(cluster.startTs).toUpperCase()}</div>
              <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-tight">{headlineFor(cluster.items.length)}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2 font-tele text-[10px] text-dim">
                <span>{cluster.items.length} {cluster.items.length === 1 ? 'story' : 'stories'} · {fmtDur(cluster.minutes)}</span>
                {intensity && <span className="text-blood">/ {intensity.label}</span>}
              </div>
              <div className="mobile-poster-row" tabIndex={cluster.items.length > 2 ? 0 : undefined} role="group" aria-label="Posters — swipe to explore">
                {cluster.items.map(entry => (
                  <button type="button" key={entry.id} onClick={() => onSelect(entry)} aria-label={`View ${entry.title}`}>
                    <Poster entry={entry} className="aspect-[2/3] w-full ring-1 ring-white/10" />
                    <span className="mt-2 block text-left text-xs leading-snug text-fog">{entry.title}</span>
                    <span className="mt-1 block text-left font-tele text-[9px] text-dim">{entry.year} · {entry.type === 'movie' ? 'FILM' : 'SERIES'}</span>
                  </button>
                ))}
              </div>
              {cluster.items.length > 2 && <p className="font-tele text-[9px] tracking-[0.18em] text-dim">SWIPE TO EXPLORE →</p>}
            </section>
          </Fragment>
        );
      })}
      <div className="py-12 text-center">
        <div className="font-display text-5xl tracking-[0.2em] text-dim">FIN</div>
        <div className="mt-2 font-tele text-[9px] tracking-[0.2em] text-dim">{clusters.reduce((sum, c) => sum + c.items.length, 0)} TITLES · TO BE CONTINUED</div>
      </div>
    </div>
  );
}
