import { analyzeMarket, type AnalysisStyle, type MarketAnalysis } from "./analysis";
import { styleHorizon } from "./duration";
import { getInstrument } from "./instruments";
import type { MarketPayload } from "./market.server";

export type ScanRow = {
  symbol: string;
  label: string;
  group: string;
  style: AnalysisStyle;
  price: number;
  quality: number;
  setup: string;
  setupId: string;
  side: "BUY" | "SELL" | null;
  reason: string;
  duration: string;
  maxHours: number;
  analysis: MarketAnalysis;
};

const STYLES_TO_SCAN: AnalysisStyle[] = ["intraday", "scalp"];

export function rankScan(rows: MarketPayload[], busyGroups: string[]): ScanRow[] {
  const out: ScanRow[] = [];
  for (const style of STYLES_TO_SCAN) {
    const horizon = styleHorizon(style);
    for (const row of rows) {
      const instrument = getInstrument(row.symbol);
      const analysis = analyzeMarket(row.candles, row.higher, instrument, style);
      if (!analysis) continue;
      const side: "BUY" | "SELL" | null = analysis.allowed.long
        ? "BUY"
        : analysis.allowed.short
          ? "SELL"
          : null;
      const blockedGroup = busyGroups.includes(instrument.group);
      out.push({
        symbol: row.symbol,
        label: instrument.label,
        group: instrument.group,
        style,
        price: analysis.price,
        quality: analysis.quality,
        setup: analysis.setup.label,
        setupId: analysis.setup.id,
        side: blockedGroup ? null : side,
        reason: blockedGroup
          ? "Gruppo già a mercato."
          : side
            ? analysis.setup.label
            : (analysis.blockReason ?? "Nessun setup"),
        duration: horizon.label,
        maxHours: horizon.maxHours,
        analysis,
      });
    }
  }
  return out.sort((a, b) => {
    const aOk = a.side ? 1 : 0;
    const bOk = b.side ? 1 : 0;
    if (aOk !== bOk) return bOk - aOk;
    if (a.quality !== b.quality) return b.quality - a.quality;
    if (a.style !== b.style) return a.style === "intraday" ? -1 : 1;
    return a.label.localeCompare(b.label, "it");
  });
}

export function pickBest(rows: ScanRow[]): ScanRow | null {
  const valid = rows.filter((row) => row.side != null);
  if (!valid.length) return null;
  const day = valid.filter((row) => row.style === "intraday");
  const scalp = valid.filter((row) => row.style === "scalp");
  if (day.length && scalp.length) {
    const bestDay = day[0];
    const bestScalp = scalp[0];
    if (bestScalp.quality >= bestDay.quality + 15) return bestScalp;
    return bestDay;
  }
  return valid[0];
}

export function bestPerMarket(rows: ScanRow[]): ScanRow[] {
  const map = new Map<string, ScanRow>();
  for (const row of rows) {
    const prev = map.get(row.symbol);
    if (!prev) {
      map.set(row.symbol, row);
      continue;
    }
    const prevOk = prev.side ? 1 : 0;
    const nextOk = row.side ? 1 : 0;
    if (nextOk > prevOk || (nextOk === prevOk && row.quality > prev.quality)) {
      map.set(row.symbol, row);
    }
  }
  return [...map.values()].sort((a, b) => {
    const aOk = a.side ? 1 : 0;
    const bOk = b.side ? 1 : 0;
    if (aOk !== bOk) return bOk - aOk;
    return b.quality - a.quality;
  });
}
