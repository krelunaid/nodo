import { cleanCandles, resampleCandles, type Candle } from "./candles";
import { getInstrument, TIMEFRAMES, type TimeframeId } from "./instruments";

type YahooChart = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      meta?: { regularMarketPrice?: number };
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(symbol: string, tfMinutes: number, count = 280): Candle[] {
  const bases: Record<string, number> = {
    EURUSD: 1.157,
    GBPUSD: 1.268,
    USDJPY: 147.2,
    USDCHF: 0.801,
    AUDUSD: 0.652,
    USDCAD: 1.378,
    NZDUSD: 0.592,
    EURGBP: 0.862,
    EURJPY: 170.4,
    GBPJPY: 197.6,
    EURCHF: 0.927,
    AUDJPY: 96.1,
    XAUUSD: 2480,
    XAGUSD: 29.4,
    US500: 5450,
    US100: 19200,
    US30: 39800,
    GER40: 18400,
    UK100: 8250,
    FRA40: 7600,
    ESP35: 11200,
    JPN225: 38500,
    AUS200: 7900,
    USOIL: 78.4,
    UKOIL: 82.1,
    NATGAS: 2.35,
    BTCUSD: 67500,
    ETHUSD: 3450,
    SOLUSD: 148,
  };
  const start = bases[symbol] ?? 100;
  const rand = mulberry32(hash(`${symbol}-${tfMinutes}-${Math.floor(Date.now() / 3_600_000)}`));
  const now = Date.now();
  const step = tfMinutes * 60 * 1000;
  const candles: Candle[] = [];
  let price = start;
  for (let i = count; i >= 0; i -= 1) {
    const drift = (rand() - 0.49) * price * 0.0018;
    const shock = (rand() - 0.5) * price * 0.0035;
    const open = price;
    const close = Math.max(0.0001, price + drift + shock);
    const high = Math.max(open, close) + rand() * price * 0.0012;
    const low = Math.min(open, close) - rand() * price * 0.0012;
    candles.push({
      time: now - i * step,
      open,
      high,
      low,
      close,
      volume: 800 + rand() * 4200,
    });
    price = close;
  }
  return candles;
}

async function fetchYahoo(symbol: string, interval: string, range: string): Promise<Candle[]> {
  const url = new URL("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol));
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`yahoo ${res.status}`);
  const json = (await res.json()) as YahooChart;
  const result = json.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const stamps = result?.timestamp;
  if (!result || !quote || !stamps) throw new Error("yahoo empty");
  const candles: Candle[] = [];
  for (let i = 0; i < stamps.length; i += 1) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    if (open == null || high == null || low == null || close == null) continue;
    candles.push({
      time: stamps[i] * 1000,
      open,
      high,
      low,
      close,
      volume: quote.volume?.[i] ?? 0,
    });
  }
  return cleanCandles(candles);
}

export type MarketPayload = {
  symbol: string;
  timeframe: TimeframeId;
  source: "live" | "simulated";
  candles: Candle[];
  higher: Candle[];
  lastPrice: number;
};

export async function loadMarket(
  symbol: string,
  timeframe: TimeframeId,
): Promise<MarketPayload> {
  const instrument = getInstrument(symbol);
  const tf = TIMEFRAMES.find((item) => item.id === timeframe) ?? TIMEFRAMES[1];

  try {
    const raw = await fetchYahoo(instrument.yahoo, tf.yahoo, tf.range);
    const candles = tf.id === "4h" ? resampleCandles(raw, 240) : raw;
    let higher: Candle[] = [];
    try {
      if (tf.higher === "1d") {
        higher = await fetchYahoo(instrument.yahoo, "1d", "1y");
      } else {
        const higherTf = TIMEFRAMES.find((item) => item.id === tf.higher) ?? TIMEFRAMES[2];
        const rawH = await fetchYahoo(instrument.yahoo, higherTf.yahoo, higherTf.range);
        higher = rawH;
      }
    } catch {
      higher = resampleCandles(candles, tf.higher === "1d" ? 1440 : 60);
    }
    const last = candles.at(-1);
    if (!last) throw new Error("no candles");
    return {
      symbol: instrument.id,
      timeframe: tf.id,
      source: "live",
      candles: candles.slice(-240),
      higher: higher.slice(-180),
      lastPrice: last.close,
    };
  } catch {
    const candles = simulate(instrument.id, tf.minutes);
    const higher = resampleCandles(candles, tf.higher === "1d" ? 1440 : 60);
    return {
      symbol: instrument.id,
      timeframe: tf.id,
      source: "simulated",
      candles,
      higher,
      lastPrice: candles.at(-1)!.close,
    };
  }
}
