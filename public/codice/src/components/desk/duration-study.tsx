import { useEffect, useState } from "react";
import { getDurationStudy } from "@/lib/trading/functions";
import { formatDuration } from "@/lib/trading/duration";
import type { DurationStudy } from "@/lib/trading/study.server";

function hoursLabel(h: number): string {
  return formatDuration(h * 3_600_000);
}

function StudyCard({
  title,
  blurb,
  study,
}: {
  title: string;
  blurb: string;
  study: DurationStudy | null;
}) {
  return (
    <article className="rounded-lg border border-border bg-bg p-4">
      <p className="text-[11px] font-medium tracking-wide text-subtle uppercase">{title}</p>
      <p className="mt-1 text-sm text-pretty text-muted">{blurb}</p>
      {!study ? (
        <p className="mt-3 text-sm text-subtle">Calcolo in corso…</p>
      ) : study.trades === 0 ? (
        <p className="mt-3 text-sm text-muted">Nessun trade nello storico recente.</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Stat label="Operazioni" value={String(study.trades)} />
            <Stat label="Win" value={`${study.win}%`} />
            <Stat label="Durata media" value={hoursLabel(study.avgHours)} />
            <Stat label="80% chiude entro" value={hoursLabel(study.p80Hours)} />
            <Stat label="Più breve" value={hoursLabel(study.minHours)} />
            <Stat label="Più lunga" value={hoursLabel(study.maxHours)} />
          </dl>
          <ul className="mt-3 space-y-1.5">
            {study.buckets.map((b) => (
              <li key={b.label} className="flex items-center gap-2 text-[12px]">
                <span className="w-20 shrink-0 text-subtle">{b.label}</span>
                <span
                  className="h-1.5 rounded-full bg-accent/80"
                  style={{
                    width: `${study.trades ? Math.max(6, (b.n / study.trades) * 100) : 6}%`,
                  }}
                />
                <span className="font-mono tabular-nums text-muted">{b.n}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-subtle">{label}</dt>
      <dd className="mt-0.5 font-mono text-fg tabular-nums">{value}</dd>
    </div>
  );
}

export function DurationStudyPanel() {
  const [day, setDay] = useState<DurationStudy | null>(null);
  const [scalp, setScalp] = useState<DurationStudy | null>(null);

  useEffect(() => {
    let alive = true;
    getDurationStudy()
      .then((data) => {
        if (!alive) return;
        setDay(data.intraday);
        setScalp(data.scalp);
      })
      .catch(() => {
        /* keep empty */
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="grid gap-3 md:grid-cols-2">
      <StudyCard
        title="Day trading · quante ore"
        blurb="Su uno storico recente (EUR/USD, oro, Bitcoin a 15 min). Il time stop è 4 ore: se non ha colpito stop o target, esce."
        study={day}
      />
      <StudyCard
        title="Scalping · quanti minuti"
        blurb="Stessa logica sul 5 minuti. Se il desk vede volatilità alta e un setup pulito, sceglie questo invece del day trading."
        study={scalp}
      />
    </section>
  );
}
