import { Fragment } from 'react';
import { Poster } from '../components/Poster';
import { fmtDur, fmtMonth, headlineFor, intensityFor, yearOf, type Cluster, type Entry, type Order } from '../data/library';

/* The narrow-screen track: natural document flow keeps captions clear of the
   art, and each cluster is a native horizontal rail so every poster is reachable. */
export default function MobileTrack({ clusters, order, onSelect }: {
  clusters: Cluster[];
  order: Order;
  onSelect: (entry: Entry) => void;
}) {
  return (
    <div className="pt-6">
      {clusters.map((c, index) => {
        const year = yearOf(c.items[0], order);
        const previousYear = index ? yearOf(clusters[index - 1].items[0], order) : null;
        const intensity = intensityFor(c, order);
        return (
          <Fragment key={c.key}>
            {year !== previousYear && (
              <div className="mb-6 mt-4 flex items-end gap-4">
                <span className="font-display text-7xl font-extrabold leading-[0.8] text-bone">{year}</span>
              </div>
            )}
            <section className="relative ml-1.5 min-w-0 border-l border-line pb-10 pl-5" aria-label={`${fmtMonth(c.startTs)}, ${c.size} titles`}>
              <span className="absolute -left-[5px] top-1 h-[9px] w-[9px] rounded-full border border-blood bg-ink" />
              <div className="label text-fog">{fmtMonth(c.startTs)}</div>
              <h3 className="mt-2 text-xl font-semibold leading-tight tracking-tight">{headlineFor(c, order)}</h3>
              {order === 'watch' && c.kind === 'backlog' && (
                <p className="mt-2 text-sm leading-relaxed text-fog">Mostly logged on a single day — catching the record up, not one sitting.</p>
              )}
              <div className="label mt-2 flex flex-wrap items-center gap-2 text-[9px] text-dim">
                <span>{c.size} {c.size === 1 ? 'title' : 'titles'} · {fmtDur(c.minutes)}</span>
                {intensity && <span className="text-blood">/ {intensity.label}</span>}
              </div>
              <div className="strip -mr-4 flex snap-x gap-3 pb-2 pr-4 pt-4" role="group" aria-label="Posters">
                {c.items.map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => onSelect(e)}
                    className="w-[clamp(104px,30vw,140px)] shrink-0 snap-start text-left"
                  >
                    <Poster entry={e} className="aspect-[2/3] w-full outline outline-1 -outline-offset-1 outline-white/10" />
                    <span className="mt-2 block text-xs leading-snug text-fog">{e.title}</span>
                    <span className="label mt-1 block text-[8.5px] text-dim">{e.year} · {e.type === 'movie' ? 'Film' : 'Series'}</span>
                  </button>
                ))}
              </div>
              {c.size > 2 && <p className="label text-[8.5px] text-dim">Swipe →</p>}
            </section>
          </Fragment>
        );
      })}
      <div className="py-12 text-center">
        <div className="font-display text-5xl font-extrabold tracking-[0.3em] text-rule">FIN</div>
      </div>
    </div>
  );
}
