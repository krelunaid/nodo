import type { StyleId } from "./risk";
import { STYLES } from "./risk";
import type { Position } from "./types";

export const STAKE: Record<StyleId, number> = {
  scalp: 10,
  intraday: 50,
  swing: 200,
};

export const MAX_PER_STYLE: Record<StyleId, number> = {
  scalp: 1,
  intraday: 1,
  swing: 1,
};

export const MAX_TRADE_RISK_PCT = 1;
export const MAX_TOTAL_RISK_PCT = 3;

export const CAPITAL_PRESETS = [1000, 5000, 10_000] as const;

export function maxPositionsFor(equity: number): number {
  if (equity < 3000) return 1;
  if (equity < 8000) return 2;
  return 3;
}

export function maxSameStyle(equity: number): number {
  return 1;
}

export function stakeFor(equity: number, style: StyleId): number {
  const wanted = STAKE[style];
  const cap = (equity * MAX_TRADE_RISK_PCT) / 100;
  return Math.min(wanted, Math.max(0, cap));
}

export function styleOf(position: Position): StyleId {
  if (position.style === "scalp" || position.style === "intraday" || position.style === "swing") {
    return position.style;
  }
  return "intraday";
}

export function usedRisk(open: Position[]): number {
  return open.reduce((sum, p) => sum + (p.riskAmount || 0), 0);
}

export function countStyle(open: Position[], style: StyleId): number {
  return open.filter((p) => styleOf(p) === style).length;
}

export function styleUnlocked(
  equity: number,
  style: StyleId,
): { ok: boolean; reason: string } {
  const wanted = STAKE[style];
  const cap = (equity * MAX_TRADE_RISK_PCT) / 100;
  if (wanted > cap + 0.009) {
    const need = Math.ceil(wanted / (MAX_TRADE_RISK_PCT / 100));
    return {
      ok: false,
      reason: `${STYLES[style].label} da ${wanted} € richiede circa ${need.toLocaleString("it-IT")} € (max 1% a trade). Con ${equity.toLocaleString("it-IT")} € il tetto è ${cap.toFixed(0)} €.`,
    };
  }
  return { ok: true, reason: "" };
}

export type AllocationCheck = {
  ok: boolean;
  reasons: string[];
  stake: number;
  budgetLeft: number;
  maxPositions: number;
  openCount: number;
};

export function canOpenStyle(input: {
  equity: number;
  open: Position[];
  style: StyleId;
  group: string;
}): AllocationCheck {
  const reasons: string[] = [];
  const unlocked = styleUnlocked(input.equity, input.style);
  const stake = unlocked.ok ? STAKE[input.style] : 0;
  const maxPos = maxPositionsFor(input.equity);
  const budget = (input.equity * MAX_TOTAL_RISK_PCT) / 100;
  const spent = usedRisk(input.open);
  const left = Math.max(0, budget - spent);
  if (!unlocked.ok) reasons.push(unlocked.reason);

  if (input.open.length >= maxPos) {
    reasons.push(
      input.equity < 3000
        ? "Con meno di 3.000 € una sola operazione alla volta. Così non bruci il conto."
        : `Libro pieno: massimo ${maxPos} operazioni insieme.`,
    );
  }
  if (countStyle(input.open, input.style) >= MAX_PER_STYLE[input.style]) {
    reasons.push(
      `Già un ${STYLES[input.style].label.toLowerCase()} aperto. Non due dello stesso tipo.`,
    );
  }
  if (stake > left + 0.009) {
    reasons.push(
      `Budget rischio finito: restano ${left.toFixed(0)} € su ${budget.toFixed(0)} € (3% del conto).`,
    );
  }
  if (input.open.some((p) => p.group === input.group)) {
    reasons.push("Gruppo già a mercato. Non raddoppiare il rischio correlato.");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    stake,
    budgetLeft: left,
    maxPositions: maxPos,
    openCount: input.open.length,
  };
}

export function preferredStyle(equity: number, open: Position[]): StyleId | null {
  const order: StyleId[] = ["scalp", "intraday", "swing"];
  for (const style of order) {
    if (canOpenStyle({ equity, open, style, group: "__none__" }).ok) return style;
  }
  return null;
}

export function allocationSummary(equity: number, open: Position[]) {
  const budget = (equity * MAX_TOTAL_RISK_PCT) / 100;
  return {
    equity,
    maxPositions: maxPositionsFor(equity),
    budget,
    spent: usedRisk(open),
    left: Math.max(0, budget - usedRisk(open)),
    scalp: {
      used: countStyle(open, "scalp"),
      max: MAX_PER_STYLE.scalp,
      stake: STAKE.scalp,
      on: styleUnlocked(equity, "scalp").ok,
    },
    intraday: {
      used: countStyle(open, "intraday"),
      max: MAX_PER_STYLE.intraday,
      stake: STAKE.intraday,
      on: styleUnlocked(equity, "intraday").ok,
    },
    swing: {
      used: countStyle(open, "swing"),
      max: MAX_PER_STYLE.swing,
      stake: STAKE.swing,
      on: styleUnlocked(equity, "swing").ok,
    },
  };
}
