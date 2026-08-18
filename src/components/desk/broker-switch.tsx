import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { probeCapital } from "@/lib/capital/functions";
import { LIVE_UNLOCKED } from "@/lib/trading/cost";
import type { ProbeAccount, ProbeResult } from "@/lib/capital/types";
import { formatMoney } from "@/lib/trading/instruments";
import { cn } from "@/lib/utils";

export type BrokerMode = "paper" | "demo" | "live";

type Props = {
  mode: BrokerMode;
  onMode: (mode: BrokerMode) => void;
  result: ProbeResult | null;
  onResult: (result: ProbeResult | null) => void;
};

const MODES: Array<{ id: BrokerMode; label: string; hint: string }> = [
  { id: "paper", label: "Osservazione", hint: "Paper, zero broker" },
  { id: "demo", label: "Demo Capital.com", hint: "Login e osservazione API" },
  { id: "live", label: "Personale", hint: "Vietato finché lo studio è rosso" },
];

export function BrokerSwitch({ mode, onMode, result, onResult }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirmLive, setConfirmLive] = useState(false);
  const [busy, setBusy] = useState(false);

  function switchMode(next: BrokerMode) {
    onMode(next);
    onResult(null);
    setConfirmLive(false);
    setPassword("");
  }

  async function connect() {
    if (mode === "paper") return;
    if (mode === "live" && !LIVE_UNLOCKED) {
      toast.error("Live chiuso. Prima osservazione e demo.");
      return;
    }
    setBusy(true);
    try {
      const data = await probeCapital({
        data: {
          environment: mode,
          identifier,
          apiKey,
          password,
          confirmLive: mode === "live" ? confirmLive : false,
        },
      });
      onResult(data);
      setPassword("");
      if (data.ok) {
        toast.success(
          mode === "demo" ? "Demo collegata. Zero ordini inviati." : "Login live ok. Nessun ordine.",
        );
      } else {
        toast.error(data.error?.message ?? "Collegamento rifiutato.");
      }
    } catch {
      toast.error("Impossibile raggiungere Capital.com.");
    } finally {
      setBusy(false);
    }
  }

  const preferred = preferredAccount(result);

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Dove lo provi
          </p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-pretty text-muted">
            Prima osservazione (paper), poi demo Capital.com. Il Live resta
            chiuso finché lo studio con spread e slittamento extra non è positivo.
          </p>
        </div>
        {result?.ok && (
          <Badge variant={result.environment === "live" ? "warn" : "ok"}>
            {result.environment === "live" ? "Personale · solo login" : "Demo · login ok"}
          </Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => switchMode(item.id)}
            className={cn(
              "min-h-11 rounded-md border px-3 py-2.5 text-left transition-[border-color,background-color] duration-150",
              mode === item.id
                ? item.id === "live"
                  ? "border-warn bg-warn/10"
                  : "border-accent bg-elevated"
                : "border-border bg-bg hover:border-border-strong",
            )}
          >
            <span className="block text-sm font-medium text-fg">{item.label}</span>
            <span className="mt-0.5 block text-[12px] text-muted">{item.hint}</span>
          </button>
        ))}
      </div>

      {mode === "live" && (
        <p className="mt-4 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-[13px] leading-snug text-warn-fg">
          Live spento. La strategia non è positiva con costi e slittamento extra.
          Solo osservazione e demo.
        </p>
      )}

      {mode === "demo" && (
        <div className="mt-4 grid gap-3 border-t border-border pt-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field
              label="Identificativo"
              value={identifier}
              onChange={setIdentifier}
              autoComplete="username"
            />
            <Field
              label="API key"
              value={apiKey}
              onChange={setApiKey}
              autoComplete="off"
            />
            <Field
              label="Password API"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete="current-password"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || !identifier || !apiKey || !password}
              onClick={() => void connect()}
            >
              {busy ? "Verifico…" : "Collega demo"}
            </Button>
            {result && (
              <Button type="button" variant="ghost" onClick={() => onResult(null)}>
                Pulisci esito
              </Button>
            )}
          </div>
          <p className="text-[12px] text-subtle">
            Chiavi solo in memoria. Login demo, zero ordini. La password API è
            quella della chiave, non quella del sito.
          </p>
        </div>
      )}

      {result && <ProbePanel result={result} preferred={preferred} />}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <Label htmlFor={label}>{label}</Label>
      <Input
        id={label}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function preferredAccount(result: ProbeResult | null): ProbeAccount | null {
  if (!result?.accounts.length) return null;
  return result.accounts.find((a) => a.preferred) ?? result.accounts[0];
}

function ProbePanel({
  result,
  preferred,
}: {
  result: ProbeResult;
  preferred: ProbeAccount | null;
}) {
  return (
    <div className="mt-4 rounded-md border border-border bg-bg p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          Esito API
        </p>
        <Badge variant={result.ok ? "ok" : "danger"}>
          {result.ok ? "Connesso" : "Fallito"}
        </Badge>
      </div>
      {result.error && (
        <p className="mt-2 text-sm text-danger-fg">{result.error.message}</p>
      )}
      {preferred && (
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <Stat label="Conto" value={preferred.accountName} />
          <Stat label="Tipo" value={preferred.accountType} />
          <Stat
            label="Saldo"
            value={
              preferred.balance == null
                ? "—"
                : formatMoney(preferred.balance, preferred.currency || "EUR")
            }
          />
          <Stat
            label="Disponibile"
            value={
              preferred.available == null
                ? "—"
                : formatMoney(preferred.available, preferred.currency || "EUR")
            }
          />
        </dl>
      )}
      <ul className="mt-3 space-y-1 font-mono text-[11px] text-subtle">
        {result.steps.map((step) => (
          <li key={step.name}>
            {step.ok ? "ok" : "no"} · {step.name} · {step.detail}
          </li>
        ))}
        <li>
          {result.latencyMs} ms · {result.host.replace("https://", "")}
        </li>
      </ul>
    </div>
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
