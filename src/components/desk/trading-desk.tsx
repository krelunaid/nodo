import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyzeMarket } from "@/lib/trading/analysis";
import type { ProbeResult } from "@/lib/capital/types";
import type { Candle } from "@/lib/trading/candles";
import { getMarket, scanMarkets } from "@/lib/trading/functions";
import {
  CATEGORIES,
  INSTRUMENTS,
  TIMEFRAMES,
  formatPrice,
  getInstrument,
  instrumentsByCategory,
  type MarketCategory,
  type TimeframeId,
} from "@/lib/trading/instruments";
import { pickBest, rankScan, type ScanRow } from "@/lib/trading/scan";
import { STYLES, suggestedLevels, type Side, type StyleId } from "@/lib/trading/risk";
import { currentFxSession, londonNowLabel } from "@/lib/trading/session";
import { useDeskStore } from "@/lib/trading/store";
import { applyBreakeven, markPosition } from "@/lib/trading/types";
import { AuthSlot } from "./auth-slot";
import { BrokerSwitch, type BrokerMode } from "./broker-switch";
import { Book } from "./book";
import { CapitalBoard } from "./capital-board";
import { FactorBoard } from "./factor-board";
import { PriceChart } from "./price-chart";
import { Rules } from "./rules";
import { Scanner } from "./scanner";
import { Ticket } from "./ticket";
import { Verdict } from "./verdict";

export function TradingDesk() {
  const settings = useDeskStore((s) => s.settings);
  const applyStyle = useDeskStore((s) => s.applyStyle);
  const patchSettings = useDeskStore((s) => s.patchSettings);
  const open = useDeskStore((s) => s.open);
  const closeMany = useDeskStore((s) => s.closeMany);
  const replaceOpen = useDeskStore((s) => s.replaceOpen);
  const equity = useDeskStore((s) => s.equity);
  const realized = useDeskStore((s) => s.realized);

  const [symbol, setSymbol] = useState("US500");
  const [category, setCategory] = useState<MarketCategory>("index");
  const [timeframe, setTimeframe] = useState<TimeframeId>("1h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [higher, setHigher] = useState<Candle[]>([]);
  const [source, setSource] = useState<"live" | "simulated">("simulated");
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(londonNowLabel);
  const [side, setSide] = useState<Side>("BUY");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [panel, setPanel] = useState<"analisi" | "ticket" | "libro">("analisi");
  const [brokerMode, setBrokerMode] = useState<BrokerMode>("paper");
  const [brokerResult, setBrokerResult] = useState<ProbeResult | null>(null);
  const [autoPick, setAutoPick] = useState(true);
  const [scanRows, setScanRows] = useState<ScanRow[]>([]);
  const [scanning, setScanning] = useState(false);

  const instrument = getInstrument(symbol);
  const price = candles.at(-1)?.close ?? 0;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getMarket({ data: { symbol, timeframe } })
      .then((data) => {
        if (!alive) return;
        setCandles(data.candles);
        setHigher(data.higher);
        setSource(data.source);
      })
      .catch(() => {
        if (alive) toast.error("Mercato non disponibile, riprova.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [symbol, timeframe]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(londonNowLabel()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open.length || !candles.length) return;
    const last = candles[candles.length - 1];
    const stepped = open.map((p) => {
      const high = p.symbol === symbol ? last.high : p.entry;
      const low = p.symbol === symbol ? last.low : p.entry;
      return applyBreakeven(p, { high, low });
    });
    if (stepped.some((p, i) => p.stopLoss !== open[i].stopLoss)) {
      replaceOpen(stepped);
    }
    const closed = stepped
      .map((p) =>
        markPosition(p, {
          high: p.symbol === symbol ? last.high : p.entry,
          low: p.symbol === symbol ? last.low : p.entry,
          close: p.symbol === symbol ? last.close : p.entry,
          time: Date.now(),
        }),
      )
      .filter((x): x is NonNullable<typeof x> => x != null);
    if (closed.length) {
      closeMany(closed);
      for (const trade of closed) {
        const label =
          trade.exitReason === "sl"
            ? "Stop loss"
            : trade.exitReason === "tp"
              ? "Take profit"
              : "Time stop";
        toast(label, { description: `${trade.symbol} chiuso` });
      }
    }
  }, [candles, open, symbol, closeMany, replaceOpen]);

  const analysis = useMemo(
    () => analyzeMarket(candles, higher, instrument, settings.style),
    [candles, higher, instrument, settings.style],
  );

  function applySuggest() {
    if (!analysis) return;
    const levels = suggestedLevels(
      side,
      analysis.price,
      analysis.atr,
      instrument,
      settings.minRr,
      analysis.signal,
      analysis.structure,
    );
    setStopLoss(levels.stop.toFixed(instrument.digits));
    setTakeProfit(levels.target.toFixed(instrument.digits));
  }

  function applyPick(row: ScanRow) {
    setSymbol(row.symbol);
    setCategory(getInstrument(row.symbol).category);
    if (row.side) setSide(row.side);
    if (row.analysis && row.side) {
      const inst = getInstrument(row.symbol);
      const levels = suggestedLevels(
        row.side,
        row.analysis.price,
        row.analysis.atr,
        inst,
        settings.minRr,
        row.analysis.signal,
        row.analysis.structure,
      );
      setStopLoss(levels.stop.toFixed(inst.digits));
      setTakeProfit(levels.target.toFixed(inst.digits));
    } else {
      setStopLoss("");
      setTakeProfit("");
    }
  }

  const runScan = useCallback(
    async (adopt: boolean) => {
      setScanning(true);
      try {
        const rows = await scanMarkets({ data: { timeframe } });
        const busy = useDeskStore.getState().open.map((p) => p.group);
        const snap = useDeskStore.getState();
        const ranked = rankScan(rows, busy, snap.open, snap.equity);
        setScanRows(ranked);
        if (adopt) {
          const best = pickBest(ranked, useDeskStore.getState().open, useDeskStore.getState().equity);
          if (best) {
            applyPick(best);
            toast.message("Il desk ha scelto", {
              description: `${best.label} · ${best.setup}`,
            });
          }
        }
      } catch {
        toast.error("Scansione non riuscita.");
      } finally {
        setScanning(false);
      }
    },
    [timeframe, settings.style, settings.minRr],
  );

  useEffect(() => {
    void runScan(autoPick);
  }, [runScan, autoPick]);

  function changeStyle(style: StyleId) {
    applyStyle(style);
    setTimeframe(STYLES[style].tf);
    setStopLoss("");
    setTakeProfit("");
  }

  const prices = { [symbol]: price };
  const session = currentFxSession();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-[0.16em] text-subtle uppercase">
              Paper desk
            </p>
            <h1 className="mt-1 text-xl font-medium tracking-tight text-balance">
              Checklist e freni. Non un edge.
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant={session.quality === "alta" ? "ok" : "warn"}>{clock} Londra</Badge>
            <span className="font-mono text-xs text-muted tabular-nums">
              Equity {equity.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
            </span>
            <span className="font-mono text-xs text-subtle tabular-nums">
              Realizzato {realized.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
            </span>
            <span className="font-mono text-xs text-subtle tabular-nums">
              Aperte {open.length}/{settings.maxPositions}
            </span>
            <a
              href="/codice"
              className="inline-flex h-9 items-center rounded-sm border border-border bg-elevated px-3 text-xs font-medium text-fg hover:border-border-strong"
            >
              Codice sorgente
            </a>
            <AuthSlot />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        <p className="max-w-3xl text-sm leading-relaxed text-pretty text-muted">
          Day trading selettivo: lo strumento lo sceglie il rapporto spread/ATR.
          Niente scalp su mercati cari. Live spento finché lo studio con costi
          extra non è verde. Prima osservazione, poi demo.
        </p>

        <BrokerSwitch
          mode={brokerMode}
          onMode={setBrokerMode}
          result={brokerResult}
          onResult={setBrokerResult}
        />

        <Verdict />

        <CapitalBoard />

        <Rules />

        <Scanner
          auto={autoPick}
          onAuto={setAutoPick}
          scanning={scanning}
          rows={scanRows}
          picked={symbol}
          onPick={(id) => {
            const row = scanRows.find((r) => r.symbol === id);
            if (row) applyPick(row);
            else setSymbol(id);
          }}
          onRefresh={() => void runScan(autoPick)}
        />

        <div className="flex flex-wrap gap-2">
          {(Object.keys(STYLES) as StyleId[]).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={settings.style === key ? "default" : "secondary"}
              onClick={() => changeStyle(key)}
            >
              {STYLES[key].label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={settings.minRr <= 1.5 ? "default" : "secondary"}
            onClick={() => patchSettings({ minRr: 1.5 })}
          >
            1.5R più vittorie
          </Button>
          <Button
            type="button"
            size="sm"
            variant={settings.minRr >= 2 ? "default" : "secondary"}
            onClick={() => patchSettings({ minRr: 2 })}
          >
            2R più grosso
          </Button>
          <span className="self-center text-xs text-subtle">
            {STYLES[settings.style].duration} · puntata{" "}
            {settings.riskEur || Math.round((settings.startingEquity * settings.riskPct) / 100)}{" "}
            € · target{" "}
            {((settings.riskEur || 50) * settings.minRr).toFixed(0)} €
          </span>
        </div>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                type="button"
                size="sm"
                variant={cat.id === category ? "secondary" : "ghost"}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
                <span className="text-subtle">
                  {INSTRUMENTS.filter((i) => i.category === cat.id).length}
                </span>
              </Button>
            ))}
            <span className="self-center text-xs text-subtle">
              {INSTRUMENTS.length} mercati
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="flex flex-wrap gap-1.5">
            {instrumentsByCategory(category).map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={item.id === symbol ? "default" : "ghost"}
                onClick={() => {
                  setSymbol(item.id);
                  setStopLoss("");
                  setTakeProfit("");
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.id}
                type="button"
                size="sm"
                variant={tf.id === timeframe ? "secondary" : "ghost"}
                onClick={() => setTimeframe(tf.id)}
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
          <div className="rounded-xl border border-border bg-surface p-3 shadow-panel">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <div>
                <p className="text-sm font-medium">{instrument.label}</p>
                <p className="text-[12px] text-muted">{instrument.description}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg leading-none tabular-nums">
                  {price ? formatPrice(price, instrument.digits) : "—"}
                </p>
                <p className="mt-1 text-[11px] text-subtle">
                  {loading
                    ? "Carico…"
                    : source === "live"
                      ? "Prezzi di mercato"
                      : "Serie simulata (feed non disponibile)"}
                </p>
              </div>
            </div>
            <div className="h-[320px] overflow-hidden rounded-lg md:h-[420px]">
              <PriceChart
                candles={candles}
                instrument={instrument}
                analysis={analysis}
                positions={open}
                draft={{
                  stopLoss: stopLoss ? Number(stopLoss) : null,
                  takeProfit: takeProfit ? Number(takeProfit) : null,
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface p-1 xl:hidden">
              {(["analisi", "ticket", "libro"] as const).map((id) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={panel === id ? "default" : "ghost"}
                  onClick={() => setPanel(id)}
                >
                  {id === "analisi" ? "Analisi" : id === "ticket" ? "Ticket" : "Libro"}
                </Button>
              ))}
            </div>

            <div
              className={`rounded-xl border border-border bg-surface p-4 shadow-panel ${panel === "analisi" ? "block" : "hidden"} xl:block`}
            >
              <FactorBoard analysis={analysis} />
            </div>
            <div
              className={`rounded-xl border border-border bg-surface p-4 shadow-panel ${panel === "ticket" ? "block" : "hidden"} xl:block`}
            >
              <Ticket
                brokerMode={brokerMode}
                brokerConnected={brokerResult?.ok === true}
                instrument={instrument}
                price={price}
                analysis={analysis}
                side={side}
                stopLoss={stopLoss}
                takeProfit={takeProfit}
                onSide={(next) => {
                  setSide(next);
                  setStopLoss("");
                  setTakeProfit("");
                }}
                onStop={setStopLoss}
                onTarget={setTakeProfit}
                onSuggest={applySuggest}
              />
            </div>
          </div>
        </div>

        <div
          className={`rounded-xl border border-border bg-surface p-4 shadow-panel ${panel === "libro" ? "block" : "hidden"} xl:block`}
        >
          <Book prices={prices} />
        </div>
      </main>
    </div>
  );
}
