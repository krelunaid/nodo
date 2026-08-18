import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MarketAnalysis } from "@/lib/trading/analysis";
import { formatMoney, formatPrice, type Instrument } from "@/lib/trading/instruments";
import { evaluateTicket, type Side } from "@/lib/trading/risk";
import { useDeskStore } from "@/lib/trading/store";
import { cn } from "@/lib/utils";
import type { BrokerMode } from "./broker-switch";

type Props = {
  brokerMode: BrokerMode;
  brokerConnected: boolean;
  instrument: Instrument;
  price: number;
  analysis: MarketAnalysis | null;
  side: Side;
  stopLoss: string;
  takeProfit: string;
  onSide: (side: Side) => void;
  onStop: (value: string) => void;
  onTarget: (value: string) => void;
  onSuggest: () => void;
};

export function Ticket({
  brokerMode,
  brokerConnected,
  instrument,
  price,
  analysis,
  side,
  stopLoss,
  takeProfit,
  onSide,
  onStop,
  onTarget,
  onSuggest,
}: Props) {
  const settings = useDeskStore((s) => s.settings);
  const equity = useDeskStore((s) => s.equity);
  const open = useDeskStore((s) => s.open);
  const openTrade = useDeskStore((s) => s.openTrade);

  const sl = stopLoss === "" ? null : Number(stopLoss);
  const tp = takeProfit === "" ? null : Number(takeProfit);
  const check = evaluateTicket({
    side,
    price,
    stopLoss: sl != null && Number.isFinite(sl) ? sl : null,
    takeProfit: tp != null && Number.isFinite(tp) ? tp : null,
    equity,
    settings,
    instrument,
    analysis,
    openCount: open.length,
    sameGroupOpen: open.filter((p) => p.group === instrument.group).length,
  });

  const liveBlocked = brokerMode === "live";
  const canSubmit = check.ok && !liveBlocked;

  function submit() {
    if (liveBlocked) return;
    if (!check.ok || sl == null || tp == null) return;
    openTrade({
      symbol: instrument.id,
      side,
      size: check.size,
      entry: price,
      stopLoss: sl,
      takeProfit: tp,
      riskAmount: check.riskAmount,
      quality: analysis?.quality ?? 0,
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          Ticket — stop sulla candela, target 2R
        </p>
        <p className="mt-1 text-sm text-pretty text-muted">
          {brokerMode === "live"
            ? "Interruttore su Personale: il login si verifica sopra. Da qui non parte nessun ordine sul conto reale."
            : brokerMode === "demo"
              ? brokerConnected
                ? "Demo collegata. Le aperture restano paper: hai solo provato che l’API risponde."
                : "Collega il demo sopra per verificare le chiavi. Gli ordini restano paper."
              : "Senza entrambi i livelli il tasto resta spento."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={side === "BUY" ? "default" : "secondary"}
          onClick={() => onSide("BUY")}
        >
          Long
        </Button>
        <Button
          type="button"
          variant={side === "SELL" ? "default" : "secondary"}
          onClick={() => onSide("SELL")}
        >
          Short
        </Button>
      </div>

      <div className="grid gap-3">
        <Field
          label="Stop loss"
          value={stopLoss}
          onChange={onStop}
          placeholder={formatPrice(check.suggestedStop, instrument.digits)}
        />
        <Field
          label="Take profit"
          value={takeProfit}
          onChange={onTarget}
          placeholder={formatPrice(check.suggestedTarget, instrument.digits)}
        />
      </div>

      <dl className="grid grid-cols-2 gap-2 rounded-md border border-border bg-bg p-3 text-xs">
        <Row label="Rischio" value={formatMoney(check.riskAmount)} />
        <Row
          label="R:R"
          value={check.rr == null ? "—" : `${check.rr.toFixed(2)}`}
        />
        <Row label="Size" value={check.size.toFixed(2)} />
        <Row label="Target €" value={formatMoney(check.rewardAmount)} />
      </dl>

      {check.reasons.length > 0 && (
        <ul className="space-y-1.5 text-[12px] leading-snug text-danger-fg">
          {check.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <Button type="button" variant="secondary" onClick={onSuggest}>
          SL sulla candela · TP a 2R
        </Button>
        <Button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className={cn(!canSubmit && "opacity-40")}
        >
          {liveBlocked ? "Ordini live bloccati" : "Apri paper trade"}
        </Button>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-1.5">
      <Label htmlFor={label}>{label}</Label>
      <Input
        id={label}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(",", "."))}
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-subtle">{label}</dt>
      <dd className="font-mono tabular-nums text-fg">{value}</dd>
    </div>
  );
}
