const MARKETS = [
  ["EURUSD", "EURUSD=X", 0.00008],
  ["GBPUSD", "GBPUSD=X", 0.00012],
  ["USDJPY", "JPY=X", 0.012],
  ["AUDUSD", "AUDUSD=X", 0.00012],
  ["USDCAD", "CAD=X", 0.00013],
  ["EURJPY", "EURJPY=X", 0.018],
  ["GBPJPY", "GBPJPY=X", 0.025],
  ["XAUUSD", "GC=F", 0.25],
  ["XAGUSD", "SI=F", 0.02],
  ["US500", "^GSPC", 0.4],
  ["US100", "^NDX", 0.8],
  ["GER40", "^GDAXI", 1.2],
  ["UK100", "^FTSE", 1],
  ["USOIL", "CL=F", 0.03],
  ["BTCUSD", "BTC-USD", 12],
  ["ETHUSD", "ETH-USD", 1.2],
];

function ema(values, period) {
  const out = Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}
function sma(values, period) {
  const out = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}
function rsi(values, period = 14) {
  const out = Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + (d > 0 ? d : 0)) / period;
    loss = (loss * (period - 1) + (d < 0 ? -d : 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}
function atr(candles, period = 14) {
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prev = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
  return sma(tr, period);
}
function londonHour(ms) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(ms));
  const weekday = (parts.find((p) => p.type === "weekday")?.value ?? "").toLowerCase();
  const hour = Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const weekend = weekday.startsWith("sat") || weekday.startsWith("sun");
  return { sessionOk: !weekend && hour >= 8 && hour < 21 };
}

async function fetchYahoo(symbol, interval, range) {
  const url = new URL(
    "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol),
  );
  url.searchParams.set("interval", interval);
  url.searchParams.set("range", range);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${symbol} ${res.status}`);
  const json = await res.json();
  const result = json.chart?.result?.[0];
  const q = result?.indicators?.quote?.[0];
  const ts = result?.timestamp ?? [];
  const candles = [];
  for (let i = 0; i < ts.length; i++) {
    const open = q.open?.[i];
    const high = q.high?.[i];
    const low = q.low?.[i];
    const close = q.close?.[i];
    if (open == null || high == null || low == null || close == null) continue;
    candles.push({
      time: ts[i] * 1000,
      open,
      high,
      low,
      close,
      volume: q.volume?.[i] ?? 0,
    });
  }
  return candles;
}

function backtest(candles, spread, rrTarget) {
  const closes = candles.map((c) => c.close);
  const vols = candles.map((c) => c.volume);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const r = rsi(closes, 14);
  const a = atr(candles, 14);
  const vavg = sma(vols, 20);
  const trades = [];
  let open = null;

  for (let i = 50; i < candles.length; i++) {
    const c = candles[i];
    if (open) {
      const hitSl = open.side === "BUY" ? c.low <= open.sl : c.high >= open.sl;
      const hitTp = open.side === "BUY" ? c.high >= open.tp : c.low <= open.tp;
      const timed = i - open.bar >= 16;
      if (hitSl || hitTp || timed) {
        let exit = c.close;
        let reason = "time";
        if (hitSl && hitTp) {
          exit = open.sl;
          reason = "sl";
        } else if (hitSl) {
          exit = open.sl;
          reason = "sl";
        } else if (hitTp) {
          exit = open.tp;
          reason = "tp";
        }
        const pnl =
          open.side === "BUY"
            ? (exit - open.entry) / open.risk
            : (open.entry - exit) / open.risk;
        trades.push({ r: pnl, reason });
        open = null;
      }
      continue;
    }

    if (!londonHour(c.time).sessionOk) continue;
    const fast = e20[i];
    const slow = e50[i];
    const rsiNow = r[i];
    const atrNow = a[i];
    const volR = vavg[i] ? c.volume / vavg[i] : 1;
    if (fast == null || slow == null || rsiNow == null || !atrNow) continue;
    const atrPct = (atrNow / c.close) * 100;
    if (atrPct < 0.06) continue;
    if (c.volume > 0 && volR < 1.15) continue;

    let side = null;
    if (fast > slow && rsiNow >= 50 && c.close > slow) side = "BUY";
    if (fast < slow && rsiNow <= 50 && c.close < slow) side = "SELL";
    if (!side) continue;
    if (Math.abs(c.close - fast) > atrNow * 0.9) continue;

    const pad = Math.max(spread * 2, atrNow * 0.1);
    const sl = side === "BUY" ? c.low - pad : c.high + pad;
    const risk = Math.abs(c.close - sl);
    if (risk < atrNow * 0.3 || risk > atrNow * 2.8) continue;
    const entry = side === "BUY" ? c.close + spread / 2 : c.close - spread / 2;
    const tp = side === "BUY" ? entry + risk * rrTarget : entry - risk * rrTarget;
    open = { side, entry, sl, tp, risk, bar: i };
  }
  return trades;
}

function pack(trades) {
  if (!trades.length) return { n: 0, win: 0, exp: 0, total: 0 };
  const wins = trades.filter((t) => t.r > 0);
  const sum = trades.reduce((s, t) => s + t.r, 0);
  return {
    n: trades.length,
    win: Math.round((wins.length / trades.length) * 1000) / 10,
    exp: Number((sum / trades.length).toFixed(3)),
    total: Number(sum.toFixed(1)),
    tp: trades.filter((t) => t.reason === "tp").length,
    sl: trades.filter((t) => t.reason === "sl").length,
    time: trades.filter((t) => t.reason === "time").length,
  };
}

const cache = {};
for (const [id, yahoo] of MARKETS) {
  try {
    cache[id] = { candles: await fetchYahoo(yahoo, "15m", "3mo"), spread: MARKETS.find((m) => m[0] === id)[2] };
  } catch (e) {
    cache[id] = { error: String(e.message || e) };
  }
}

const summary = {};
for (const rr of [1, 1.5, 2]) {
  const all = [];
  const per = {};
  for (const [id] of MARKETS) {
    const row = cache[id];
    if (!row?.candles) {
      per[id] = { error: row?.error ?? "no data" };
      continue;
    }
    const trades = backtest(row.candles, row.spread, rr);
    per[id] = { bars: row.candles.length, ...pack(trades) };
    all.push(...trades);
  }
  summary[`R${rr}`] = { all: pack(all), per };
}
console.log(JSON.stringify(summary, null, 2));
