const MARKETS = [
  ["EURUSD", "EURUSD=X", 0.00008, 5],
  ["GBPUSD", "GBPUSD=X", 0.00012, 5],
  ["USDJPY", "JPY=X", 0.012, 3],
  ["XAUUSD", "GC=F", 0.25, 2],
  ["XAGUSD", "SI=F", 0.02, 3],
  ["US500", "^GSPC", 0.4, 2],
  ["US100", "^NDX", 0.8, 2],
  ["GER40", "^GDAXI", 1.2, 1],
  ["USOIL", "CL=F", 0.03, 2],
  ["BTCUSD", "BTC-USD", 12, 1],
  ["ETHUSD", "ETH-USD", 1.2, 2],
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
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= period; loss /= period;
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
    timeZone: "Europe/London", weekday: "short", hour: "numeric", hour12: false,
  }).formatToParts(new Date(ms));
  const weekday = (parts.find((p) => p.type === "weekday")?.value ?? "").toLowerCase();
  const hour = Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const weekend = weekday.startsWith("sat") || weekday.startsWith("sun");
  const quality = weekend ? "bassa" : hour >= 8 && hour < 17 ? "alta" : hour >= 17 && hour < 21 ? "media" : "bassa";
  return { weekend, hour, quality, sessionOk: !weekend && quality !== "bassa" };
}

async function fetchYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=15m&range=1mo`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
  if (!res.ok) throw new Error(`${symbol} ${res.status}`);
  const json = await res.json();
  const result = json.chart?.result?.[0];
  const q = result?.indicators?.quote?.[0];
  const ts = result?.timestamp ?? [];
  const candles = [];
  for (let i = 0; i < ts.length; i++) {
    const open = q.open?.[i], high = q.high?.[i], low = q.low?.[i], close = q.close?.[i];
    if (open == null || high == null || low == null || close == null) continue;
    candles.push({ time: ts[i] * 1000, open, high, low, close, volume: q.volume?.[i] ?? 0 });
  }
  return candles;
}

function backtest(candles, spread) {
  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const r = rsi(closes, 14);
  const a = atr(candles, 14);
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
        if (hitSl) { exit = open.sl; reason = "sl"; }
        else if (hitTp) { exit = open.tp; reason = "tp"; }
        const rMult = open.side === "BUY" ? (exit - open.entry) / open.risk : (open.entry - exit) / open.risk;
        trades.push({ r: rMult, reason, symbol: open.symbol });
        open = null;
      }
      continue;
    }

    const sess = londonHour(c.time);
    if (!sess.sessionOk) continue;
    const fast = e20[i], slow = e50[i], rsiNow = r[i], atrNow = a[i];
    if (fast == null || slow == null || rsiNow == null || !atrNow) continue;
    if ((atrNow / c.close) * 100 < 0.08) continue;
    const rangeOk = c.high - c.low >= atrNow * 0.7;
    if (!rangeOk) continue;
    const bull = c.close > c.open;
    const bear = c.close < c.open;
    const nearFast = Math.abs(c.close - fast) <= atrNow * 0.45;
    const stretched = Math.abs(c.close - slow) / slow > 0.018;
    if (stretched) continue;

    let side = null;
    if (fast > slow && rsiNow >= 50 && rsiNow <= 68 && bull && c.close > slow && nearFast) side = "BUY";
    if (fast < slow && rsiNow <= 50 && rsiNow >= 32 && bear && c.close < slow && nearFast) side = "SELL";
    if (!side) continue;

    const pad = Math.max(spread * 2, atrNow * 0.12);
    const sl = side === "BUY" ? c.low - pad : c.high + pad;
    const risk = Math.abs(c.close - sl);
    if (risk < atrNow * 0.35 || risk > atrNow * 2.8) continue;
    const entry = side === "BUY" ? c.close + spread / 2 : c.close - spread / 2;
    const look = candles.slice(Math.max(0, i - 12), i);
    const swingHi = Math.max(...look.map((x) => x.high));
    const swingLo = Math.min(...look.map((x) => x.low));
    const atrCap = atrNow * 1.35;
    let tp = side === "BUY" ? Math.min(swingHi, entry + atrCap) : Math.max(swingLo, entry - atrCap);
    const reward = Math.abs(tp - entry);
    if (reward < risk * 1.2) continue;
    open = { side, entry, sl, tp, risk, bar: i, symbol: "x" };
  }
  return trades;
}

function moneyPath(trades, equity0, stake) {
  let eq = equity0;
  let peak = eq;
  let maxDd = 0;
  const marks = [];
  for (const t of trades) {
    const risk = Math.min(stake, eq * 0.05);
    if (eq < risk) break;
    eq += t.r * risk;
    if (eq > peak) peak = eq;
    maxDd = Math.max(maxDd, peak - eq);
    marks.push(eq);
  }
  return { end: eq, pnl: eq - equity0, maxDd, n: marks.length };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const all = [];
const per = {};
for (const [id, yahoo, spread] of MARKETS) {
  try {
    const candles = await fetchYahoo(yahoo);
    const trades = backtest(candles, spread).map((t) => ({ ...t, symbol: id }));
    per[id] = {
      bars: candles.length,
      n: trades.length,
      win: trades.length ? Math.round((trades.filter((t) => t.r > 0).length / trades.length) * 100) : 0,
      avgR: trades.length ? Number((trades.reduce((s, t) => s + t.r, 0) / trades.length).toFixed(3)) : 0,
    };
    all.push(...trades);
  } catch (e) {
    per[id] = { error: String(e.message || e) };
  }
  await sleep(180);
}

all.sort((a, b) => 0);
const wins = all.filter((t) => t.r > 0);
const avgR = all.length ? all.reduce((s, t) => s + t.r, 0) / all.length : 0;
const win = all.length ? wins.length / all.length : 0;

function scaleToN(trades, n) {
  if (!trades.length) return [];
  const out = [];
  for (let i = 0; i < n; i++) out.push(trades[i % trades.length]);
  return out;
}

const month10k50 = moneyPath(all, 10000, 50);
const month1k50 = moneyPath(all, 1000, 50);
const k10k = moneyPath(scaleToN(all, 1000), 10000, 50);
const k1k = moneyPath(scaleToN(all, 1000), 1000, 50);

console.log(JSON.stringify({
  month: {
    trades: all.length,
    winPct: Number((win * 100).toFixed(1)),
    avgR: Number(avgR.toFixed(3)),
    sl: all.filter((t) => t.reason === "sl").length,
    tp: all.filter((t) => t.reason === "tp").length,
    time: all.filter((t) => t.reason === "time").length,
    eur_10000_stake50: month10k50,
    eur_1000_stake50: month1k50,
  },
  after1000: {
    note: "Stessi trade del mese, ripetuti fino a 1000 (non un anno magico).",
    eur_10000_stake50: k10k,
    eur_1000_stake50: k1k,
  },
  per,
}, null, 2));
