const MARKETS = [
  ["EURUSD", "EURUSD=X", 0.00008],
  ["GBPUSD", "GBPUSD=X", 0.00012],
  ["USDJPY", "JPY=X", 0.012],
  ["XAUUSD", "GC=F", 0.25],
  ["US500", "^GSPC", 0.4],
  ["GER40", "^GDAXI", 1.2],
  ["ETHUSD", "ETH-USD", 1.2],
  ["BTCUSD", "BTC-USD", 12],
];

function ema(v, p) {
  const o = Array(v.length).fill(null);
  if (v.length < p) return o;
  const k = 2 / (p + 1);
  let prev = v.slice(0, p).reduce((a, b) => a + b, 0) / p;
  o[p - 1] = prev;
  for (let i = p; i < v.length; i++) {
    prev = v[i] * k + prev * (1 - k);
    o[i] = prev;
  }
  return o;
}
function sma(v, p) {
  const o = Array(v.length).fill(null);
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    s += v[i];
    if (i >= p) s -= v[i - p];
    if (i >= p - 1) o[i] = s / p;
  }
  return o;
}
function rsi(v, p = 14) {
  const o = Array(v.length).fill(null);
  if (v.length <= p) return o;
  let g = 0, l = 0;
  for (let i = 1; i <= p; i++) {
    const d = v[i] - v[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  g /= p; l /= p;
  o[p] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = p + 1; i < v.length; i++) {
    const d = v[i] - v[i - 1];
    g = (g * (p - 1) + (d > 0 ? d : 0)) / p;
    l = (l * (p - 1) + (d < 0 ? -d : 0)) / p;
    o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return o;
}
function atr(c, p = 14) {
  return sma(
    c.map((x, i) =>
      i === 0
        ? x.high - x.low
        : Math.max(x.high - x.low, Math.abs(x.high - c[i - 1].close), Math.abs(x.low - c[i - 1].close)),
    ),
    p,
  );
}
function london(ms) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "short", hour: "numeric", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(ms));
  const g = (t) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = g("weekday").toLowerCase();
  const hour = Number.parseInt(g("hour"), 10) || 0;
  const day = `${g("year")}-${g("month")}-${g("day")}`;
  const weekend = wd.startsWith("sat") || wd.startsWith("sun");
  const chop = hour < 11 || hour >= 21 || weekend;
  const ok = !weekend && ((hour >= 11 && hour < 13) || (hour >= 13 && hour < 21));
  return { hour, day, weekend, chop, ok };
}

async function fetchYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=60m&range=2y`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
  if (!res.ok) throw new Error(`${symbol} ${res.status}`);
  const json = await res.json();
  const r = json.chart?.result?.[0];
  const q = r?.indicators?.quote?.[0];
  const ts = r?.timestamp ?? [];
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    if ([q.open[i], q.high[i], q.low[i], q.close[i]].some((x) => x == null)) continue;
    out.push({ time: ts[i] * 1000, open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], symbol });
  }
  return out;
}

function signals(candles, spread, symbol) {
  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const rs = rsi(closes);
  const at = atr(candles);
  const rows = [];
  for (let i = 55; i < candles.length; i++) {
    const c = candles[i];
    const s = london(c.time);
    if (!s.ok) continue;
    const fast = e20[i], slow = e50[i], rsiNow = rs[i], atrNow = at[i];
    if (fast == null || slow == null || rsiNow == null || !atrNow) continue;
    let side = null;
    if (fast > slow && rsiNow >= 50 && rsiNow <= 64 && c.close > c.open && Math.abs(c.close - fast) <= atrNow * 0.4) side = "BUY";
    if (fast < slow && rsiNow <= 50 && rsiNow >= 36 && c.close < c.open && Math.abs(c.close - fast) <= atrNow * 0.4) side = "SELL";
    if (!side) continue;
    const pad = Math.max(spread * 2, atrNow * 0.1);
    const sl = side === "BUY"
      ? Math.min(c.low, candles[i - 1].low, candles[i - 2].low) - pad
      : Math.max(c.high, candles[i - 1].high, candles[i - 2].high) + pad;
    const risk = Math.abs(c.close - sl);
    if (risk < atrNow * 0.4 || risk > atrNow * 2.2) continue;
    if (spread / risk > 0.1) continue;
    const entry = side === "BUY" ? c.close + spread / 2 : c.close - spread / 2;
    const tp = side === "BUY" ? entry + risk * 0.7 : entry - risk * 0.7;
    rows.push({ time: c.time, i, symbol, side, entry, sl, tp, risk, spread, day: s.day });
  }
  return rows;
}

function settle(candles, sig, hold = 8) {
  const start = candles.findIndex((c) => c.time >= sig.time);
  if (start < 0) return null;
  let sl = sig.sl;
  let be = false;
  for (let j = start + 1; j < candles.length && j <= start + hold; j++) {
    const c = candles[j];
    const fav = sig.side === "BUY" ? c.high - sig.entry : sig.entry - c.low;
    if (!be && fav >= sig.risk * 0.35) {
      sl = sig.entry + (sig.side === "BUY" ? sig.spread : -sig.spread);
      be = true;
    }
    const hitSl = sig.side === "BUY" ? c.low <= sl : c.high >= sl;
    const hitTp = sig.side === "BUY" ? c.high >= sig.tp : c.low <= sig.tp;
    if (hitTp) {
      const r = (sig.tp - sig.entry) / sig.risk * (sig.side === "BUY" ? 1 : -1);
      return { r: sig.side === "BUY" ? (sig.tp - sig.entry) / sig.risk : (sig.entry - sig.tp) / sig.risk, reason: "tp", end: c.time };
    }
    if (hitSl) {
      const r = sig.side === "BUY" ? (sl - sig.entry) / sig.risk : (sig.entry - sl) / sig.risk;
      return { r, reason: be ? "be" : "sl", end: c.time };
    }
  }
  const last = candles[Math.min(start + hold, candles.length - 1)];
  const r = sig.side === "BUY" ? (last.close - sig.entry) / sig.risk : (sig.entry - last.close) / sig.risk;
  return { r, reason: "time", end: last.time };
}

const books = {};
for (const [id, y, sp] of MARKETS) {
  try {
    const c = await fetchYahoo(y);
    books[id] = { candles: c, spread: sp, signals: signals(c, sp, id) };
    console.error(id, "bars", c.length, "signals", books[id].signals.length);
  } catch (e) {
    console.error(id, e.message);
  }
  await new Promise((r) => setTimeout(r, 160));
}

const queue = [];
for (const id of Object.keys(books)) {
  for (const s of books[id].signals) queue.push(s);
}
queue.sort((a, b) => a.time - b.time);

let equity = 1000;
const startEq = 1000;
let busyUntil = 0;
let day = "";
let dayPnl = 0;
let dayTrades = 0;
let streak = 0;
const trades = [];
let skippedHalt = 0;

for (const sig of queue) {
  if (trades.length >= 1000) break;
  if (sig.time < busyUntil) continue;
  if (sig.day !== day) {
    day = sig.day;
    dayPnl = 0;
    dayTrades = 0;
    streak = 0;
  }
  const cap = equity * 0.02;
  if (dayPnl <= -cap || streak >= 2 || dayTrades >= 3) {
    skippedHalt++;
    continue;
  }
  const book = books[sig.symbol];
  const res = settle(book.candles, sig, 8);
  if (!res) continue;
  const stake = Math.min(10, Math.max(0, equity * 0.01));
  if (stake < 5) break;
  const pnl = res.r * stake;
  equity += pnl;
  dayPnl += pnl;
  dayTrades += 1;
  if (res.r < -0.05) streak += 1;
  else streak = 0;
  busyUntil = res.end;
  trades.push({
    symbol: sig.symbol,
    day: sig.day,
    r: +res.r.toFixed(3),
    reason: res.reason,
    pnl: +pnl.toFixed(2),
    equity: +equity.toFixed(2),
  });
}

const wins = trades.filter((t) => t.r > 0.05);
const bes = trades.filter((t) => t.reason === "be" || (t.r >= -0.05 && t.r <= 0.05));
const sl = trades.filter((t) => t.reason === "sl");
let peak = startEq, maxDd = 0;
for (const t of trades) {
  if (t.equity > peak) peak = t.equity;
  maxDd = Math.max(maxDd, peak - t.equity);
}

const first = trades[0];
const last = trades[trades.length - 1];
console.log(JSON.stringify({
  real: true,
  data: "Yahoo 60m, 2 anni, 8 mercati, niente petrolio",
  rules: "1000€, 1% (10€), 1 posizione, tetto giorno 2%, 2 stop = stop, max 3/giorno, no 8-11 Londra, TP 0.7R, BE 0.35R",
  trades: trades.length,
  skippedByHalt: skippedHalt,
  from: first?.day ?? null,
  to: last?.day ?? null,
  start: startEq,
  end: +equity.toFixed(2),
  pnl: +(equity - startEq).toFixed(2),
  winPct: trades.length ? +((wins.length / trades.length) * 100).toFixed(1) : 0,
  bePct: trades.length ? +((bes.length / trades.length) * 100).toFixed(1) : 0,
  sl: sl.length,
  tp: trades.filter((t) => t.reason === "tp").length,
  time: trades.filter((t) => t.reason === "time").length,
  maxDd: +maxDd.toFixed(2),
  minEquity: trades.length ? Math.min(...trades.map((t) => t.equity)) : startEq,
  last20: trades.slice(-8),
}, null, 2));
