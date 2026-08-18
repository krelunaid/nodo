import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ScanRow } from "@/lib/trading/scan";
import { cn } from "@/lib/utils";

type Props = {
  auto: boolean;
  onAuto: (value: boolean) => void;
  scanning: boolean;
  rows: ScanRow[];
  picked: string | null;
  onPick: (symbol: string) => void;
  onRefresh: () => void;
};

export function Scanner({
  auto,
  onAuto,
  scanning,
  rows,
  picked,
  onPick,
  onRefresh,
}: Props) {
  const live = rows.filter((r) => r.side);
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Scelta autonoma
          </p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-pretty text-muted">
            Il desk legge tutti e sei i mercati con le stesse quattro domande.
            Se autonoma è accesa, passa da solo al setup più pulito. Non apre
            il trade: prepara lato, stop e target.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={auto ? "default" : "secondary"}
            onClick={() => onAuto(!auto)}
          >
            {auto ? "Autonoma on" : "Autonoma off"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onRefresh} disabled={scanning}>
            {scanning ? "Scansione…" : "Rileggi"}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-xs text-subtle">
        {scanning
          ? "Sto confrontando i sei mercati…"
          : live.length
            ? `${live.length} setup valido${live.length > 1 ? "i" : ""}.`
            : "Nessun mercato passa le quattro domande ora."}
      </p>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <button
            key={row.symbol}
            type="button"
            onClick={() => onPick(row.symbol)}
            className={cn(
              "rounded-md border px-3 py-2.5 text-left transition-[border-color,background-color] duration-150",
              picked === row.symbol
                ? "border-accent bg-elevated"
                : "border-border bg-bg hover:border-border-strong",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{row.label}</span>
              <Badge variant={row.side ? "ok" : "default"}>
                {row.side ?? "fuori"}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-[11px] text-subtle tabular-nums">
              Qualità {row.quality} · {row.setup}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-muted">{row.reason}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
