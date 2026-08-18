import type { MarketAnalysis } from "./analysis";
import type { Instrument } from "./instruments";

export type Side = "BUY" | "SELL";
export type StyleId = "scalp" | "intraday" | "swing";

export type DeskSettings = {
  style: StyleId;
  startingEquity: number;
  riskPct: number;
  maxPositions: number;
  minRr: number;
  timeStopMinutes: number;
};

export const STYLES: Record<
  StyleId,
  {
    label: string;
    tf: "5m" | "15m" | "1h";
    settings: Pick<DeskSettings, "riskPct" | "maxPositions" | "minRr" | "timeStopMinutes">;
    blurb: string;
    duration: string;
  }
> = {
  scalp: {
    label: "Scalping",
    tf: "5m",
    settings: { riskPct: 0.35, maxPositions: 1, minRr: 2, timeStopMinutes: 40 },
    blurb: "EMA 9/21 + RSI vicino a 50 + VWAP. Una sola posizione. Target 2R.",
    duration: "5–40 minuti",
  },
  intraday: {
    label: "Intraday",
    tf: "15m",
    settings: { riskPct: 0.5, maxPositions: 2, minRr: 2, timeStopMinutes: 240 },
    blurb: "EMA 20/50 + RSI filtro + volume 1.2×. Massimo due idee non correlate.",
    duration: "30 minuti – 4 ore",
  },
  swing: {
    label: "Swing",
    tf: "1h",
    settings: { riskPct: 0.6, maxPositions: 3, minRr: 2, timeStopMinutes: 2880 },
    blurb: "Prezzo sopra EMA 50, RSI torna sopra 50, volume 1.5×. Target 2R.",
    duration: "4 ore – 2 giorni",
  },
};

export const DEFAULT_SETTINGS: DeskSettings = {
  style: "intraday",
  startingEquity: 10_000,
  ...STYLES.intraday.settings,
};

export type TicketCheck = {
  ok: boolean;
  reasons: string[];
  riskAmount: number;
  rewardAmount: number;
  rr: number | null;
  size: number;
  stopDistance: number;
  suggestedStop: number;
  suggestedTarget: number;
};

export function suggestedLevels(
  side: Side,
  price: number,
  atrValue: number,
  instrument: Instrument,
  minRr: number,
  signal?: { high: number; low: number },
) {
  const pad = Math.max(instrument.spread * 2, atrValue * 0.12);
  let stop: number;
  if (side === "BUY") {
    const candleStop = signal ? signal.low - pad : price - atrValue * 1.1;
    stop = Math.min(candleStop, price - Math.max(instrument.spread * 4, atrValue * 0.35));
  } else {
    const candleStop = signal ? signal.high + pad : price + atrValue * 1.1;
    stop = Math.max(candleStop, price + Math.max(instrument.spread * 4, atrValue * 0.35));
  }
  const stopDist = Math.abs(price - stop);
  const targetDist = stopDist * Math.max(minRr, 2);
  const target = side === "BUY" ? price + targetDist : price - targetDist;
  return { stop, target, stopDist, targetDist };
}

export function evaluateTicket(input: {
  side: Side;
  price: number;
  stopLoss: number | null;
  takeProfit: number | null;
  equity: number;
  settings: DeskSettings;
  instrument: Instrument;
  analysis: MarketAnalysis | null;
  openCount: number;
  sameGroupOpen: number;
}): TicketCheck {
  const reasons: string[] = [];
  const { side, price, stopLoss, takeProfit, equity, settings, instrument, analysis } =
    input;

  const suggested = analysis
    ? suggestedLevels(
        side,
        price,
        analysis.atr,
        instrument,
        settings.minRr,
        analysis.signal,
      )
    : suggestedLevels(side, price, price * 0.002, instrument, settings.minRr);

  if (stopLoss == null || !Number.isFinite(stopLoss)) {
    reasons.push("Stop loss obbligatorio prima di aprire.");
  }
  if (takeProfit == null || !Number.isFinite(takeProfit)) {
    reasons.push("Take profit obbligatorio prima di aprire.");
  }

  const sl = stopLoss ?? NaN;
  const tp = takeProfit ?? NaN;
  const stopDistance = Number.isFinite(sl) ? Math.abs(price - sl) : 0;
  const rewardDistance = Number.isFinite(tp) ? Math.abs(tp - price) : 0;

  if (Number.isFinite(sl)) {
    if (side === "BUY" && sl >= price) {
      reasons.push("Sul long lo stop deve stare sotto il prezzo.");
    }
    if (side === "SELL" && sl <= price) {
      reasons.push("Sullo short lo stop deve stare sopra il prezzo.");
    }
  }
  if (Number.isFinite(tp)) {
    if (side === "BUY" && tp <= price) {
      reasons.push("Sul long il take profit deve stare sopra il prezzo.");
    }
    if (side === "SELL" && tp >= price) {
      reasons.push("Sullo short il take profit deve stare sotto il prezzo.");
    }
  }

  if (stopDistance > 0 && stopDistance < instrument.spread * 4) {
    reasons.push("Stop più stretto dello spread: verrai stoppato a caso.");
  }
  if (analysis && stopDistance > 0 && stopDistance < analysis.atr * 0.35) {
    reasons.push("Stop sotto il rumore (0.35 ATR). Mettilo sotto il minimo della candela.");
  }
  if (analysis && stopDistance > analysis.atr * 2.8) {
    reasons.push("Stop oltre 2.8 ATR: idea troppo larga.");
  }

  const rr = stopDistance > 0 && rewardDistance > 0 ? rewardDistance / stopDistance : null;
  if (rr != null && rr < settings.minRr) {
    reasons.push(`R:R ${rr.toFixed(2)} sotto il minimo ${settings.minRr.toFixed(1)} (serve almeno 2R).`);
  }

  if (input.openCount >= settings.maxPositions) {
    reasons.push(
      `Libro pieno: massimo ${settings.maxPositions} operazione${settings.maxPositions > 1 ? "i" : ""} insieme.`,
    );
  }
  if (input.sameGroupOpen > 0) {
    reasons.push("Hai già rischio sullo stesso gruppo (correlazione). Non raddoppiare.");
  }

  if (analysis) {
    if (side === "BUY" && !analysis.allowed.long) {
      reasons.push(analysis.blockReason ?? "Le quattro domande non autorizzano il long.");
    }
    if (side === "SELL" && !analysis.allowed.short) {
      reasons.push(analysis.blockReason ?? "Le quattro domande non autorizzano lo short.");
    }
  } else {
    reasons.push("Analisi non pronta. Senza lettura del mercato non si apre.");
  }

  const riskAmount = (equity * settings.riskPct) / 100;
  const size = stopDistance > 0 ? riskAmount / stopDistance : 0;
  const rewardAmount = size * rewardDistance;

  return {
    ok: reasons.length === 0 && size > 0,
    reasons,
    riskAmount,
    rewardAmount,
    rr,
    size,
    stopDistance,
    suggestedStop: suggested.stop,
    suggestedTarget: suggested.target,
  };
}
