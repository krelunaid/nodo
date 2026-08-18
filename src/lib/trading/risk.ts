import { stakeFor, styleUnlocked } from "./allocation";
import { costGate } from "./cost";
import type { MarketAnalysis } from "./analysis";
import type { Instrument } from "./instruments";

export type Side = "BUY" | "SELL";
export type StyleId = "scalp" | "intraday" | "swing";

export type DeskSettings = {
  style: StyleId;
  startingEquity: number;
  riskPct: number;
  riskEur: number;
  maxPositions: number;
  minRr: number;
  timeStopMinutes: number;
};

export const STYLES: Record<
  StyleId,
  {
    label: string;
    tf: "5m" | "15m" | "1h";
    settings: Pick<
      DeskSettings,
      "riskPct" | "riskEur" | "maxPositions" | "minRr" | "timeStopMinutes"
    >;
    blurb: string;
    duration: string;
  }
> = {
  scalp: {
    label: "Scalping",
    tf: "5m",
    settings: { riskPct: 0.1, riskEur: 10, maxPositions: 1, minRr: 1, timeStopMinutes: 40 },
    blurb: "Solo se spread/ATR è basso. Altrimenti il desk lo spegne.",
    duration: "5–40 minuti",
  },
  intraday: {
    label: "Intraday",
    tf: "1h",
    settings: { riskPct: 0.5, riskEur: 50, maxPositions: 2, minRr: 1, timeStopMinutes: 240 },
    blurb: "Pochi trade, movimento più largo. Preferito dal desk.",
    duration: "1 – 4 ore",
  },
  swing: {
    label: "Swing",
    tf: "1h",
    settings: { riskPct: 2, riskEur: 200, maxPositions: 3, minRr: 2, timeStopMinutes: 2880 },
    blurb: "Puntata 200 €, target 400 €. Durata 4 ore – 2 giorni.",
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
  swing?: { lastHigh: number | null; lastLow: number | null },
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

  const atrRoom = atrValue * 1.35;
  let target: number;
  if (side === "BUY") {
    const swingT = swing?.lastHigh != null && swing.lastHigh > price ? swing.lastHigh : price + atrRoom;
    target = Math.min(swingT, price + atrRoom);
    if (target <= price) target = price + stopDist * minRr;
  } else {
    const swingT = swing?.lastLow != null && swing.lastLow < price ? swing.lastLow : price - atrRoom;
    target = Math.max(swingT, price - atrRoom);
    if (target >= price) target = price - stopDist * minRr;
  }
  const targetDist = Math.abs(target - price);
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
        analysis.structure,
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
    reasons.push(
      `Fino al massimo/minimo recente il premio è solo ${rr.toFixed(2)}R. Senza spazio reale il trade non parte.`,
    );
  }
  if (analysis?.structure && Number.isFinite(tp)) {
    const hi = analysis.structure.lastHigh;
    const lo = analysis.structure.lastLow;
    if (side === "BUY" && hi != null && tp > hi * 1.0008) {
      reasons.push(
        "Target oltre il massimo recente. Lo spazio lo dà il grafico, non un numero fisso.",
      );
    }
    if (side === "SELL" && lo != null && tp < lo * 0.9992) {
      reasons.push(
        "Target oltre il minimo recente. Senza spazio sul grafico il trade non parte.",
      );
    }
  }

  if (input.openCount >= settings.maxPositions) {
    reasons.push(
      `Libro pieno: massimo ${settings.maxPositions} operazione${settings.maxPositions > 1 ? "i" : ""} insieme.`,
    );
  }
  if (input.sameGroupOpen > 0) {
    reasons.push("Hai già rischio sullo stesso gruppo (correlazione). Non raddoppiare.");
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
    const cost = costGate(settings.style, instrument, analysis.atr);
    if (!cost.ok) reasons.push(cost.reason);
    if (side === "BUY" && !analysis.allowed.long) {
      reasons.push(analysis.blockReason ?? "Le quattro domande non autorizzano il long.");
    }
    if (side === "SELL" && !analysis.allowed.short) {
      reasons.push(analysis.blockReason ?? "Le quattro domande non autorizzano lo short.");
    }
  } else {
    reasons.push("Analisi non pronta. Senza lettura del mercato non si apre.");
  }

  const unlocked = styleUnlocked(equity, settings.style);
  if (!unlocked.ok) reasons.push(unlocked.reason);
  const riskAmount = unlocked.ok ? stakeFor(equity, settings.style) : 0;
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
