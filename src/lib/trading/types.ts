import type { Side, StyleId } from "./risk";

export type Position = {
  id: string;
  symbol: string;
  group: string;
  side: Side;
  style?: StyleId;
  size: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  openedAt: number;
  timeStopAt: number;
  riskAmount: number;
  quality: number;
  beMoved?: boolean;
};

export type ClosedTrade = Position & {
  exit: number;
  exitReason: "sl" | "tp" | "time";
  closedAt: number;
  pnl: number;
};

export function applyBreakeven(
  position: Position,
  candle: { high: number; low: number },
): Position {
  if (position.beMoved) return position;
  const risk = Math.abs(position.entry - position.stopLoss);
  if (risk <= 0) return position;
  const favorable =
    position.side === "BUY" ? candle.high - position.entry : position.entry - candle.low;
  if (favorable >= risk * 0.35) {
    return { ...position, stopLoss: position.entry, beMoved: true };
  }
  return position;
}

export function markPosition(
  position: Position,
  candle: { high: number; low: number; close: number; time: number },
): ClosedTrade | null {
  const hitStop =
    position.side === "BUY"
      ? candle.low <= position.stopLoss
      : candle.high >= position.stopLoss;
  const hitTarget =
    position.side === "BUY"
      ? candle.high >= position.takeProfit
      : candle.low <= position.takeProfit;

  if (hitStop) {
    const exit = position.stopLoss;
    const pnl =
      position.side === "BUY"
        ? (exit - position.entry) * position.size
        : (position.entry - exit) * position.size;
    return {
      ...position,
      exit,
      exitReason: "sl",
      closedAt: candle.time,
      pnl,
    };
  }
  if (hitTarget) {
    const exit = position.takeProfit;
    const pnl =
      position.side === "BUY"
        ? (exit - position.entry) * position.size
        : (position.entry - exit) * position.size;
    return {
      ...position,
      exit,
      exitReason: "tp",
      closedAt: candle.time,
      pnl,
    };
  }
  if (candle.time >= position.timeStopAt || Date.now() >= position.timeStopAt) {
    const exit = candle.close;
    const pnl =
      position.side === "BUY"
        ? (exit - position.entry) * position.size
        : (position.entry - exit) * position.size;
    return {
      ...position,
      exit,
      exitReason: "time",
      closedAt: candle.time,
      pnl,
    };
  }
  return null;
}

export function unrealized(position: Position, price: number): number {
  return position.side === "BUY"
    ? (price - position.entry) * position.size
    : (position.entry - price) * position.size;
}
