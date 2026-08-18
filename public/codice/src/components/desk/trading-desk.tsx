import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyzeMarket } from "@/lib/trading/analysis";
import type { ProbeResult } from "@/lib/capital/types";
import type { Candle } from "@/lib/trading/candles";
import { getMarket, scanMarkets } from "@/lib/trading/functions";
import {
  INSTRUMENTS,
  TIMEFRAMES,
  formatPrice,
  getInstrument,
  type TimeframeId,
} from "@/lib/trading/instruments";
import { pickBest, rankScan, type ScanRow } from "@/lib/trading/scan";
import { STYLES, suggestedLevels, type Side, type StyleId } from "@/lib/trading/risk";
import { currentFxSession, londonNowLabel } from "@/lib/trading/session";
import { useDeskStore } from "@/lib/trading/store";
import { markPosition } from "@/lib/trading/types";
import { AuthSlot } from "./auth-slot";
import { BrokerSwitch, type BrokerMode } from "./broker-switch";
import { Book } from "./book";
import { FactorBoard } from "./factor-board";
import { PriceChart } from "./price-chart";
import { Rules } from "./rules";
import { Scanner } from "./scanner";
import { Ticket } from "./ticket";

export function TradingDesk() {
  const settings = useDeskStore((s) => s.settings);
  const applyStyle = useDeskStore((s) => s.applyStyle);
  const open = useDeskStore((s) => s.open);
  const closeMany = useDeskStore((s) => s.closeMany);
  const equity = useDeskStore((s) => s.equity);
  const realized = useDeskStore((s) => s.realized);

  const [symbol, setSymbol] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState<TimeframeId>("15m");
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
    const closed = open
      .map((p) => {
        const px = p.symbol === symbol ? last : { ...last, close: last.close };
        return markPosition(p, {
          high: p.symbol === symbol ? last.high : p.entry,
          low: p.symbol === symbol ? last.low : p.entry,
          close: p.symbol === symbol ? last.close : p.entry,
          time: Date.now(),
        });
      })
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
  }, [candles, open, symbol, closeMany]);

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
    );
    setStopLoss(levels.stop.toFixed(instrument.digits));
    setTakeProfit(levels.target.toFixed(instrument.digits));
  }

  function applyPick(row: ScanRow) {
    setSymbol(row.symbol);
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
        const ranked = rankScan(rows, settings.style, busy);
        setScanRows(ranked);
        if (adopt) {
          const best = pickBest(ranked);
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
              Trend, momentum, volume, rischio
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
              href="/desk-sorgente.zip"
              download="desk-sorgente.zip"
              className="inline-flex h-9 items-center rounded-sm border border-border bg-elevated px-3 text-xs font-medium text-fg hover:border-border-strong"
            >
              Scarica codice
            </a>
            <AuthSlot />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        <p className="max-w-3xl text-sm leading-relaxed text-pretty text-muted">
          Checklist ripetibile: EMA per il trend, RSI solo come filtro, volume
          sulla candela, ATR contro i falsi breakout. Stop sotto il minimo,
          target almeno 2R. Tu scegli paper, demo o personale: sul personale
          solo login, nessun ordine.
        </p>

        <BrokerSwitch
          mode={brokerMode}
          onMode={setBrokerMode}
          result={brokerResult}
          onResult={setBrokerResult}
        />

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
          <span className="self-center text-xs text-subtle">
            {STYLES[settings.style].duration} · rischio {settings.riskPct}% · min R:R{" "}
            {settings.minRr}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="flex flex-wrap gap-1.5">
            {INSTRUMENTS.map((item) => (
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
