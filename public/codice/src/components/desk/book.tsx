import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatPrice, getInstrument } from "@/lib/trading/instruments";
import { useDeskStore } from "@/lib/trading/store";
import { unrealized, type ClosedTrade, type Position } from "@/lib/trading/types";

export function Book({ prices }: { prices: Record<string, number> }) {
  const open = useDeskStore((s) => s.open);
  const journal = useDeskStore((s) => s.journal);
  const resetBook = useDeskStore((s) => s.resetBook);
  const settings = useDeskStore((s) => s.settings);

  const wins = journal.filter((t) => t.pnl > 0).length;
  const winRate = journal.length ? Math.round((wins / journal.length) * 100) : 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Libro — max {settings.maxPositions} insieme
          </p>
          <p className="mt-1 text-sm text-muted">
            Chiusura automatica su stop, target o time stop ({settings.timeStopMinutes} min).
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={resetBook}>
          Reset paper
        </Button>
      </div>

      {open.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted">
          Nessuna posizione. Restare piatti è una scelta.
        </p>
      ) : (
        <div className="grid gap-2">
          {open.map((p) => (
            <OpenRow key={p.id} position={p} price={prices[p.symbol] ?? p.entry} />
          ))}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Diario
          </p>
          <p className="font-mono text-xs tabular-nums text-subtle">
            {journal.length} trade · {winRate}% win
          </p>
        </div>
        <div className="grid max-h-52 gap-1.5 overflow-auto pr-1">
          {journal.length === 0 ? (
            <p className="text-sm text-subtle">Ancora nessuna chiusura.</p>
          ) : (
            journal.map((t) => <ClosedRow key={`${t.id}-${t.closedAt}`} trade={t} />)
          )}
        </div>
      </div>
    </section>
  );
}

function OpenRow({ position, price }: { position: Position; price: number }) {
  const inst = getInstrument(position.symbol);
  const pnl = unrealized(position, price);
  const left = Math.max(0, position.timeStopAt - Date.now());
  const mins = Math.round(left / 60000);
  return (
    <article className="rounded-md border border-border bg-bg px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{inst.label}</span>
          <Badge variant={position.side === "BUY" ? "ok" : "danger"}>
            {position.side}
          </Badge>
        </div>
        <span
          className={`font-mono text-sm tabular-nums ${pnl >= 0 ? "text-ok-fg" : "text-danger-fg"}`}
        >
          {formatMoney(pnl)}
        </span>
      </div>
      <p className="mt-1 font-mono text-[11px] text-subtle tabular-nums">
        In {formatPrice(position.entry, inst.digits)} · SL{" "}
        {formatPrice(position.stopLoss, inst.digits)} · TP{" "}
        {formatPrice(position.takeProfit, inst.digits)} · {mins} min
      </p>
    </article>
  );
}

function ClosedRow({ trade }: { trade: ClosedTrade }) {
  const inst = getInstrument(trade.symbol);
  const reason =
    trade.exitReason === "sl" ? "stop" : trade.exitReason === "tp" ? "target" : "tempo";
  return (
    <div className="flex items-center justify-between gap-2 rounded-sm px-1 py-1 text-xs">
      <span className="text-muted">
        {inst.label} {trade.side} · {reason}
      </span>
      <span
        className={`font-mono tabular-nums ${trade.pnl >= 0 ? "text-ok-fg" : "text-danger-fg"}`}
      >
        {formatMoney(trade.pnl)}
      </span>
    </div>
  );
}
