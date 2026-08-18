import { canOpenStyle } from "./allocation";
import { analyzeMarket, type AnalysisStyle, type MarketAnalysis } from "./analysis";
import { costScore } from "./cost";
import { styleHorizon } from "./duration";
import { getInstrument } from "./instruments";
import type { MarketPayload } from "./market.server";
import type { Position } from "./types";

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

const STYLES_TO_SCAN: AnalysisStyle[] = ["intraday", "scalp", "swing"];

export function rankScan(
  rows: MarketPayload[],
  busyGroups: string[],
  open: Position[] = [],
  equity = 10_000,
): ScanRow[] {
  const out: ScanRow[] = [];
  for (const row of rows) {
    const instrument = getInstrument(row.symbol);
    for (const style of STYLES_TO_SCAN) {
      const analysis = analyzeMarket(row.candles, row.higher, instrument, style);
      if (!analysis) continue;
      const side: "BUY" | "SELL" | null = analysis.allowed.long
        ? "BUY"
        : analysis.allowed.short
          ? "SELL"
          : null;
      const gate = canOpenStyle({
        equity,
        open,
        style,
        group: instrument.group,
      });
      const blocked = busyGroups.includes(instrument.group) || !gate.ok;
      const reason = blocked
        ? gate.reasons[0] ?? "Gruppo già a mercato"
        : analysis.blockReason ?? analysis.summary;
      const horizon = styleHorizon(style);
      out.push({
        symbol: row.symbol,
        label: instrument.label,
        group: instrument.group,
        style,
        price: analysis.price,
        quality: analysis.quality,
        setup: analysis.setup.label,
        setupId: analysis.setup.id,
        side: blocked ? null : side,
        reason,
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
    if (a.style !== b.style) {
      if (a.style === "intraday") return -1;
      if (b.style === "intraday") return 1;
    }
    const aCost = costScore(getInstrument(a.symbol).spread, a.analysis.atr);
    const bCost = costScore(getInstrument(b.symbol).spread, b.analysis.atr);
    if (aCost !== bCost) return aCost - bCost;
    if (a.quality !== b.quality) return b.quality - a.quality;
    return a.label.localeCompare(b.label, "it");
  });
}

export function pickBest(rows: ScanRow[], open: Position[] = [], _equity = 10_000): ScanRow | null {
  const valid = rows.filter((row) => row.side != null);
  if (!valid.length) return null;
  const usedGroups = new Set(open.map((p) => p.group));
  const unused = valid.filter((row) => !usedGroups.has(row.group));
  const pool = unused.length ? unused : valid;
  const intra = pool.filter((row) => row.style === "intraday");
  const ranked = (intra.length ? intra : pool).slice().sort((a, b) => {
    const ac = costScore(getInstrument(a.symbol).spread, a.analysis.atr);
    const bc = costScore(getInstrument(b.symbol).spread, b.analysis.atr);
    return ac - bc;
  });
  return ranked[0] ?? null;
}

export function bestPerMarket(rows: ScanRow[]): ScanRow[] {
  const map = new Map<string, ScanRow>();
  for (const row of rows) {
    const prev = map.get(row.symbol);
    if (!prev) {
      map.set(row.symbol, row);
      continue;
    }
    const better =
      (row.side != null && prev.side == null) ||
      (row.side != null && prev.side != null && row.style === "intraday" && prev.style !== "intraday") ||
      (row.side != null &&
        prev.side != null &&
        row.style === prev.style &&
        costScore(getInstrument(row.symbol).spread, row.analysis.atr) <
          costScore(getInstrument(prev.symbol).spread, prev.analysis.atr));
    if (better) map.set(row.symbol, row);
  }
  return [...map.values()];
}
