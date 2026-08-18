import type { Instrument } from "./instruments";
import type { StyleId } from "./risk";

/** Spread / ATR oltre questa soglia: lo scalp è suicidio. */
export const MAX_SPREAD_ATR_SCALP = 0.08;
export const MAX_SPREAD_ATR_INTRA = 0.18;
export const STRESS_SPREAD = 1.5;
export const STRESS_SLIP_ATR = 0.12;

/** Live vietato finché lo studio con costi e slittamento extra non è positivo. */
export const LIVE_UNLOCKED = false;

const SCALP_BAN = new Set([
  "USDJPY",
  "AUDJPY",
  "EURJPY",
  "GBPJPY",
  "XAGUSD",
  "USOIL",
  "UKOIL",
  "NATGAS",
  "BTCUSD",
  "SOLUSD",
  "JPN225",
  "US30",
  "AUS200",
]);

export function spreadAtrRatio(spread: number, atr: number): number {
  if (!(atr > 0)) return 99;
  return spread / atr;
}

export function costGate(
  style: StyleId,
  instrument: Instrument,
  atr: number,
): { ok: boolean; reason: string; ratio: number } {
  const ratio = spreadAtrRatio(instrument.spread, atr);
  if (style === "scalp") {
    if (SCALP_BAN.has(instrument.id)) {
      return {
        ok: false,
        reason: `${instrument.label}: spread troppo largo per lo scalp. Solo intra o fuori.`,
        ratio,
      };
    }
    if (ratio > MAX_SPREAD_ATR_SCALP) {
      return {
        ok: false,
        reason: `Spread ${ (ratio * 100).toFixed(0) }% dell'ATR. Scalp vietato su questo strumento.`,
        ratio,
      };
    }
  }
  if (style === "intraday" && ratio > MAX_SPREAD_ATR_INTRA) {
    return {
      ok: false,
      reason: `Spread/ATR ${ratio.toFixed(2)}: il costo mangia il movimento. Strumento scartato.`,
      ratio,
    };
  }
  return { ok: true, reason: "", ratio };
}

export function costScore(spread: number, atr: number): number {
  return spreadAtrRatio(spread, atr);
}

export function stressedSpread(spread: number): number {
  return spread * STRESS_SPREAD;
}

export function stressedSlip(atr: number): number {
  return atr * STRESS_SLIP_ATR;
}
