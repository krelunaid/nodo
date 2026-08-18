import { analyzeMarket } from "./analysis";
import { suggestedLevels } from "./risk";
import { getInstrument } from "./instruments";
import { loadMarket } from "./market.server";

export type StudyTrade = {
  symbol: string;
  style: "intraday" | "scalp";
  side: "BUY" | "SELL";
  hours: number;
  reason: "sl" | "tp" | "time";
  r: number;
};

export type DurationStudy = {
  style: "intraday" | "scalp";
  trades: number;
  win: number;
  avgHours: number;
  medianHours: number;
  p80Hours: number;
  minHours: number;
  maxHours: number;
  buckets: Array<{ label: string; n: number }>;
};

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.floor((p / 100) * (s.length - 1))));
  return s[i];
}

function bucketIntraday(hours: number): string {
  if (hours < 0.5) return "< 30 min";
  if (hours < 1) return "30–60 min";
  if (hours < 2) return "1–2 ore";
  if (hours < 3) return "2–3 ore";
  return "3–4 ore";
}

function bucketScalp(hours: number): string {
  const min = hours * 60;
  if (min < 10) return "< 10 min";
  if (min < 20) return "10–20 min";
  if (min < 30) return "20–30 min";
  return "30–40 min";
}

function summarize(style: "intraday" | "scalp", trades: StudyTrade[]): DurationStudy {
  const hours = trades.map((t) => t.hours);
  const wins = trades.filter((t) => t.r > 0).length;
  const labels =
    style === "scalp"
      ? ["< 10 min", "10–20 min", "20–30 min", "30–40 min"]
      : ["< 30 min", "30–60 min", "1–2 ore", "2–3 ore", "3–4 ore"];
  const bucketOf = style === "scalp" ? bucketScalp : bucketIntraday;
  const buckets = labels.map((label) => ({
    label,
    n: trades.filter((t) => bucketOf(t.hours) === label).length,
  }));
  return {
    style,
    trades: trades.length,
    win: trades.length ? Math.round((wins / trades.length) * 100) : 0,
    avgHours: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : 0,
    medianHours: median(hours),
    p80Hours: percentile(hours, 80),
    minHours: hours.length ? Math.min(...hours) : 0,
    maxHours: hours.length ? Math.max(...hours) : 0,
    buckets,
  };
}

function simulate(
  payload: Awaited<ReturnType<typeof loadMarket>>,
  style: "intraday" | "scalp",
): StudyTrade[] {
  const instrument = getInstrument(payload.symbol);
  const candles = payload.candles;
  const trades: StudyTrade[] = [];
  const barMin = style === "scalp" ? 5 : 15;
  const maxBars = style === "scalp" ? 8 : 16;
  let cooldown = 0;

  for (let i = 60; i < candles.length - 1; i++) {
    if (cooldown > 0) {
      cooldown -= 1;
      continue;
    }
    const window = candles.slice(0, i + 1);
    const higher = payload.higher.filter((c) => c.time <= candles[i].time);
    const analysis = analyzeMarket(window, higher, instrument, style);
    if (!analysis) continue;
    const side = analysis.allowed.long ? "BUY" : analysis.allowed.short ? "SELL" : null;
    if (!side) continue;
    const levels = suggestedLevels(
      side,
      analysis.price,
      analysis.atr,
      instrument,
      2,
      analysis.signal,
    );
    const entry = analysis.price;
    const sl = levels.stop;
    const tp = levels.target;
    const risk = Math.abs(entry - sl);
    if (risk <= 0) continue;

    let exit = candles[i].close;
    let reason: "sl" | "tp" | "time" = "time";
    let bars = maxBars;
    for (let j = 1; j <= maxBars && i + j < candles.length; j++) {
      const c = candles[i + j];
      const hitSl = side === "BUY" ? c.low <= sl : c.high >= sl;
      const hitTp = side === "BUY" ? c.high >= tp : c.low <= tp;
      if (hitSl) {
        exit = sl;
        reason = "sl";
        bars = j;
        break;
      }
      if (hitTp) {
        exit = tp;
        reason = "tp";
        bars = j;
        break;
      }
      exit = c.close;
      bars = j;
    }
    const r = side === "BUY" ? (exit - entry) / risk : (entry - exit) / risk;
    trades.push({
      symbol: payload.symbol,
      style,
      side,
      hours: (bars * barMin) / 60,
      reason,
      r,
    });
    cooldown = bars;
    i += bars;
  }
  return trades;
}

export async function runDurationStudy(): Promise<{
  intraday: DurationStudy;
  scalp: DurationStudy;
  sample: StudyTrade[];
}> {
  const symbols = ["EURUSD", "XAUUSD", "BTCUSD"] as const;
  const [dayMarkets, scalpMarkets] = await Promise.all([
    Promise.all(symbols.map((id) => loadMarket(id, "15m"))),
    Promise.all(symbols.map((id) => loadMarket(id, "5m"))),
  ]);
  const dayTrades = dayMarkets.flatMap((m) => simulate(m, "intraday"));
  const scalpTrades = scalpMarkets.flatMap((m) => simulate(m, "scalp"));
  return {
    intraday: summarize("intraday", dayTrades),
    scalp: summarize("scalp", scalpTrades),
    sample: [...dayTrades.slice(0, 12), ...scalpTrades.slice(0, 8)],
  };
}
