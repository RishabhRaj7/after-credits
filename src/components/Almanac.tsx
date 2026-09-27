import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Poster } from './Poster';
import { Drift, Heatmap, TimeTravel } from './AlmanacCharts';
import { buildAlmanac, type Bar } from '../data/almanac';
import { factLine, fmtDate, fmtDur, fmtInt, watchMinutes, type Entry } from '../data/library';

function Cell({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`flex min-w-0 flex-col bg-ink p-5 sm:p-6 ${className}`}
    >
      <div className="label text-dim">{label}</div>
      {children}
    </motion.div>
  );
}

/* vertical bars, one series, with a stacked secondary share and a hover readout */
function Columns({
  bars,
  highlight,
  describe,
  height = 150,
}: {
  bars: Bar[];
  highlight?: string;
  describe: (b: Bar) => string;
  height?: number;
}) {
  const [hover, setHover] = useState<Bar | null>(null);
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="mt-auto pt-6">
      <div className="label mb-3 h-4 truncate normal-case tracking-[0.06em] text-fog">
        {hover ? describe(hover) : ' '}
      </div>
      <div className="flex items-end gap-[3px]" style={{ height }} onMouseLeave={() => setHover(null)}>
        {bars.map((b, i) => {
          const h = (b.value / max) * height;
          const sec = b.secondary ?? 0;
          const secH = (sec / max) * height;
          const on = hover ? hover.key === b.key : b.key === highlight;
          return (
            <button
              key={b.key}
              type="button"
              onMouseEnter={() => setHover(b)}
              onFocus={() => setHover(b)}
              onBlur={() => setHover(null)}
              aria-label={describe(b)}
              className="group flex h-full min-w-0 flex-1 cursor-default flex-col justify-end"
            >
              <motion.span
                className="flex w-full flex-col justify-end gap-[2px] overflow-hidden"
                initial={{ height: 0 }}
                whileInView={{ height: Math.max(h, 2) }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.1 + i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              >
                {secH > 1 && <span className="w-full shrink-0 bg-rule" style={{ height: Math.max(secH - 2, 1) }} />}
                <span
                  className={`w-full flex-1 rounded-t-[2px] transition-colors ${on ? 'bg-blood' : 'bg-bone/80 group-hover:bg-bone'}`}
                />
              </motion.span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[3px] border-t border-line pt-2">
        {bars.map((b) => (
          <span key={b.key} className={`label flex-1 truncate text-center text-[9px] tracking-[0.06em] ${hover?.key === b.key ? 'text-bone' : 'text-dim'}`}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function EntryFact({ entry, value, note, onOpen }: { entry: Entry | null; value: string; note: string; onOpen: (e: Entry) => void }) {
  if (!entry) return <div className="mt-4 text-sm text-dim">—</div>;
  return (
    <button type="button" onClick={() => onOpen(entry)} className="group mt-4 flex cursor-pointer items-start gap-4 text-left">
      <Poster entry={entry} className="aspect-[2/3] w-14 shrink-0 outline outline-1 -outline-offset-1 outline-white/10" />
      <span className="min-w-0">
        <span className="block font-display text-3xl font-bold leading-none text-bone">{value}</span>
        <span className="mt-2 block text-sm font-medium leading-snug text-bone underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-blood">
          {entry.title}
        </span>
        <span className="label mt-1 block text-[9px] text-dim">{note}</span>
      </span>
    </button>
  );
}

export default function Almanac({ entries, onOpen }: { entries: Entry[]; onOpen: (e: Entry) => void }) {
  const a = useMemo(() => buildAlmanac(entries), [entries]);
  const total = a.filmMinutes + a.seriesMinutes || 1;
  const filmShare = Math.round((a.filmMinutes / total) * 100);
  const decadeMax = Math.max(...a.decades.map((d) => d.value), 1);
  const biggest = [...a.backlogDays].sort((x, y) => y.count - x.count)[0];

  return (
    <section id="almanac" className="border-b border-line">
      <div className="mx-auto max-w-[1600px] px-4 py-20 sm:px-8 lg:py-28">
        <header className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-end lg:gap-10">
          <div>
            <div className="label text-blood">01 — Almanac</div>
            <h2 className="mt-3 font-display text-[clamp(52px,8vw,112px)] font-extrabold uppercase leading-[0.86] tracking-[0.01em] text-bone">
              The log, read back
            </h2>
          </div>
          <p className="max-w-[52ch] text-[15px] leading-relaxed text-fog">
            Patterns in {fmtInt(entries.length)} entries. Log dates are when a title was added, not a
            recorded watch — so {a.backlogDays.length ? `${a.backlogDays.length} backlog days` : 'bulk imports'}, when
            a dozen or more titles were logged at once, are set aside wherever timing matters.
          </p>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-6 lg:grid-cols-12">
          <Cell label="Titles logged per year" className="md:col-span-6 lg:col-span-7">
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="label flex items-center gap-2 text-[9px] text-fog"><span className="h-2 w-2 bg-bone/80" /> logged</span>
              <span className="label flex items-center gap-2 text-[9px] text-fog"><span className="h-2 w-2 bg-rule" /> backlog day</span>
              {biggest && (
                <span className="label text-[9px] text-dim">
                  largest: {fmtDate(biggest.date)} · {biggest.count} titles
                </span>
              )}
            </div>
            <Columns
              bars={a.perYear}
              highlight={[...a.perYear].sort((x, y) => y.value - x.value)[0]?.key}
              describe={(b) => `${b.key} — ${b.value} titles${b.note ? ` · ${b.note}` : ''}`}
              height={170}
            />
          </Cell>

          <Cell label="When they were made" className="md:col-span-6 lg:col-span-5">
            <div className="mt-auto space-y-3 pt-6">
              {a.decades.map((d, i) => (
                <div key={d.key} className="grid grid-cols-[48px_1fr_36px] items-center gap-3">
                  <span className="font-tele text-[11px] text-fog">{d.label}</span>
                  <span className="h-2.5 bg-smoke">
                    <motion.span
                      className={`block h-full rounded-r-[2px] ${d.value === decadeMax ? 'bg-blood' : 'bg-bone/80'}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(d.value / decadeMax) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </span>
                  <span className="text-right font-tele text-[11px] tabular-nums text-bone">{d.value}</span>
                </div>
              ))}
            </div>
            <p className="label mt-5 normal-case tracking-[0.04em] text-dim">By premiere date. Mostly the new stuff.</p>
          </Cell>

          <Cell label="Time travel · premiere year vs log date" className="md:col-span-6 lg:col-span-8">
            <TimeTravel points={a.timeTravel} onOpen={onOpen} />
          </Cell>

          <Cell label="Streaks & droughts" className="md:col-span-6 lg:col-span-4">
            <dl className="mt-auto divide-y divide-line pt-4">
              {[
                [`${a.streak.days} days`, 'Longest logging streak', `${fmtDate(a.streak.from)} → ${fmtDate(a.streak.to)}`],
                [`${a.drought.days} days`, 'Longest drought', `${fmtDate(a.drought.from)} → ${fmtDate(a.drought.to)}`],
                [`${a.activeDays}`, 'Days with a log', `median ${a.medianGapDays} days between them`],
              ].map(([v, k, note]) => (
                <div key={k} className="py-4 first:pt-0 last:pb-0">
                  <dt className="label text-[9px] text-dim">{k}</dt>
                  <dd className="mt-1 font-display text-4xl font-bold leading-none text-bone">{v}</dd>
                  <dd className="label mt-1.5 text-[9px] normal-case tracking-[0.04em] text-fog">{note}</dd>
                </div>
              ))}
            </dl>
          </Cell>

          <Cell label="Rhythm · titles per month" className="md:col-span-6 lg:col-span-7">
            <Heatmap data={a.heatmap} />
          </Cell>

          <Cell label="Genre drift · top five" className="md:col-span-6 lg:col-span-5">
            <Drift drift={a.drift} />
          </Cell>

          <Cell label="Screening day" className="md:col-span-3 lg:col-span-4">
            <div className="mt-3 font-display text-4xl font-bold uppercase leading-none text-bone">{a.topWeekday}</div>
            <Columns
              bars={a.weekdays}
              highlight={a.weekdays.find((w) => w.note === a.topWeekday)?.key}
              describe={(b) => `${b.note} — ${b.value} titles`}
              height={90}
            />
          </Cell>

          <Cell label="Premiere → log" className="md:col-span-3 lg:col-span-4">
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-6xl font-bold leading-none text-bone">{a.medianLagYears.toFixed(1)}</span>
              <span className="label text-fog">years, median</span>
            </div>
            <p className="mt-auto pt-6 text-sm leading-relaxed text-fog">
              The typical gap between a title's premiere and its place in the log.{' '}
              <span className="text-bone">{a.freshCount}</span> were logged within 30 days of release.
            </p>
          </Cell>

          <Cell label="Where the time went" className="md:col-span-6 lg:col-span-4">
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-6xl font-bold leading-none text-bone">{100 - filmShare}%</span>
              <span className="label text-fog">in series</span>
            </div>
            <div className="mt-auto pt-6">
              <div className="flex h-2.5 gap-[2px]">
                <motion.span
                  className="block h-full bg-bone/80"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${filmShare}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
                <span className="block h-full flex-1 bg-blood" />
              </div>
              <div className="mt-2 flex justify-between font-tele text-[10px] text-fog">
                <span>Films {filmShare}% · {fmtInt(a.filmMinutes / 60)}h</span>
                <span>Series {100 - filmShare}% · {fmtInt(a.seriesMinutes / 60)}h</span>
              </div>
            </div>
          </Cell>

          <Cell label="Film runtimes" className="md:col-span-6 lg:col-span-6">
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-5xl font-bold leading-none text-bone">{fmtDur(a.medianRuntime)}</span>
              <span className="label text-fog">median film</span>
            </div>
            <Columns
              bars={a.runtimes}
              highlight={a.medianRuntimeBin}
              describe={(b) => `${b.note} — ${b.value} films`}
              height={110}
            />
          </Cell>

          <Cell label="Episodes on record" className="md:col-span-3 lg:col-span-3">
            <div className="mt-3 font-display text-6xl font-bold leading-none text-bone">{fmtInt(a.episodes)}</div>
            <p className="mt-auto pt-6 text-sm leading-relaxed text-fog">
              Across {entries.filter((e) => e.type === 'show').length} series. The median series runs{' '}
              <span className="text-bone">{a.medianEpisodes} episodes</span>.
            </p>
          </Cell>

          <Cell label="Longest commitment" className="md:col-span-3 lg:col-span-3">
            <EntryFact
              entry={a.longestSeries}
              value={a.longestSeries ? `≈${fmtInt(watchMinutes(a.longestSeries) / 60)}h` : ''}
              note={a.longestSeries ? factLine(a.longestSeries) : ''}
              onOpen={onOpen}
            />
          </Cell>
          <Cell label="Longest film" className="md:col-span-2 lg:col-span-4">
            <EntryFact
              entry={a.longestFilm}
              value={a.longestFilm ? fmtDur(watchMinutes(a.longestFilm)) : ''}
              note={a.longestFilm?.year ? String(a.longestFilm.year) : ''}
              onOpen={onOpen}
            />
          </Cell>
          <Cell label="Oldest on the log" className="md:col-span-2 lg:col-span-4">
            <EntryFact entry={a.oldest} value={a.oldest?.releaseDate?.slice(0, 4) ?? ''} note={`Premiered ${fmtDate(a.oldest?.releaseDate)}`} onOpen={onOpen} />
          </Cell>
          <Cell label="Newest on the log" className="md:col-span-2 lg:col-span-4">
            <EntryFact entry={a.newest} value={a.newest?.releaseDate?.slice(0, 4) ?? ''} note={`Premiered ${fmtDate(a.newest?.releaseDate)}`} onOpen={onOpen} />
          </Cell>
        </div>
      </div>
    </section>
  );
}
