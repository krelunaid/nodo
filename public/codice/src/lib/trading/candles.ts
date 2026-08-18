export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export function resampleCandles(source: Candle[], minutes: number): Candle[] {
  if (minutes <= 0) return source;
  const bucket = minutes * 60 * 1000;
  const map = new Map<number, Candle>();
  for (const candle of source) {
    const key = Math.floor(candle.time / bucket) * bucket;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...candle, time: key });
      continue;
    }
    existing.high = Math.max(existing.high, candle.high);
    existing.low = Math.min(existing.low, candle.low);
    existing.close = candle.close;
    existing.volume += candle.volume;
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}

export function lastValid(candles: Candle[]): Candle | null {
  for (let i = candles.length - 1; i >= 0; i -= 1) {
    const candle = candles[i];
    if (
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
    ) {
      return candle;
    }
  }
  return null;
}

export function cleanCandles(candles: Candle[]): Candle[] {
  return candles.filter(
    (c) =>
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close) &&
      c.high >= c.low,
  );
}
