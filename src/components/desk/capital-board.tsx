import { Button } from "@/components/ui/button";
import {
  CAPITAL_PRESETS,
  allocationSummary,
} from "@/lib/trading/allocation";
import { errorLimit } from "@/lib/trading/error-limit";
import { formatMoney } from "@/lib/trading/instruments";
import { useDeskStore } from "@/lib/trading/store";

export function CapitalBoard() {
  const equity = useDeskStore((s) => s.equity);
  const open = useDeskStore((s) => s.open);
  const journal = useDeskStore((s) => s.journal);
  const setCapital = useDeskStore((s) => s.setCapital);
  const sum = allocationSummary(equity, open);
  const halt = errorLimit({ equity, journal });

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Limite errore
          </p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-pretty text-muted">
            Perde il meno possibile: 1% a trade, tetto giorno 2%, dopo due stop
            si ferma, pochi trade al giorno. L’errore non si insegue.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CAPITAL_PRESETS.map((amount) => (
            <Button
              key={amount}
              type="button"
              size="sm"
              variant={Math.round(equity) === amount ? "default" : "secondary"}
              onClick={() => setCapital(amount)}
            >
              {amount.toLocaleString("it-IT")} €
            </Button>
          ))}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <Stat label="Oggi" value={formatMoney(halt.dayPnl)} />
        <Stat label="Tetto giorno" value={`−${formatMoney(halt.cap)}`} />
        <Stat label="Trade oggi" value={`${halt.todayCount}/${halt.maxTrades}`} />
        <Stat label="Stop di fila" value={`${halt.streak}/2`} />
      </dl>
      {!halt.ok && (
        <p className="mt-3 text-sm text-danger-fg">{halt.reasons[0]}</p>
      )}

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <Slot
          name="Scalp"
          detail={`${sum.scalp.used}/${sum.scalp.max} · ${sum.scalp.stake} €`}
          on={sum.scalp.on}
          note={sum.scalp.on ? "5–40 min" : "Conto troppo piccolo"}
        />
        <Slot
          name="Intraday"
          detail={`${sum.intraday.used}/${sum.intraday.max} · ${sum.intraday.stake} €`}
          on={sum.intraday.on}
          note={sum.intraday.on ? "30 min – 4 ore" : "Da 5.000 €"}
        />
        <Slot
          name="Swing"
          detail={`${sum.swing.used}/${sum.swing.max} · ${sum.swing.stake} €`}
          on={sum.swing.on}
          note={sum.swing.on ? "4 ore – 2 giorni" : "Da 20.000 €"}
        />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-bg px-3 py-2">
      <dt className="text-subtle">{label}</dt>
      <dd className="mt-0.5 font-mono text-fg tabular-nums">{value}</dd>
    </div>
  );
}

function Slot({
  name,
  detail,
  on,
  note,
}: {
  name: string;
  detail: string;
  on: boolean;
  note: string;
}) {
  return (
    <article className="rounded-md border border-border bg-bg px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{name}</h3>
        <span className={on ? "text-[11px] text-ok-fg" : "text-[11px] text-danger-fg"}>
          {on ? "sbloccato" : "bloccato"}
        </span>
      </div>
      <p className="mt-1 font-mono text-[11px] text-subtle tabular-nums">{detail}</p>
      <p className="mt-1 text-[12px] text-muted">{note}</p>
    </article>
  );
}
