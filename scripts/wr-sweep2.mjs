const MARKETS = [
  ["EURUSD", "EURUSD=X", 0.00008],
  ["GBPUSD", "GBPUSD=X", 0.00012],
  ["USDJPY", "JPY=X", 0.012],
  ["XAUUSD", "GC=F", 0.25],
  ["US500", "^GSPC", 0.4],
  ["GER40", "^GDAXI", 1.2],
  ["BTCUSD", "BTC-USD", 12],
  ["ETHUSD", "ETH-USD", 1.2],
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
  const tr = c.map((x, i) => {
    if (i === 0) return x.high - x.low;
    const prev = c[i - 1].close;
    return Math.max(x.high - x.low, Math.abs(x.high - prev), Math.abs(x.low - prev));
  });
  return sma(tr, p);
}
function sess(ms) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "short", hour: "numeric", hour12: false,
  }).formatToParts(new Date(ms));
  const wd = (parts.find((p) => p.type === "weekday")?.value ?? "").toLowerCase();
  const hour = Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  if (wd.startsWith("sat") || wd.startsWith("sun")) return "off";
  if (hour >= 13 && hour < 17) return "overlap";
  if (hour >= 8 && hour < 13) return "london";
  if (hour >= 17 && hour < 21) return "ny";
  return "thin";
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
    if ([open, high, low, close].some((x) => x == null)) continue;
    candles.push({ time: ts[i] * 1000, open, high, low, close });
  }
  return candles;
}

function run(candles, spread, cfg) {
  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const r = rsi(closes, 14);
  const a = atr(candles, 14);
  const trades = [];
  let open = null;
  for (let i = 55; i < candles.length; i++) {
    const c = candles[i];
    if (open) {
      const hitSl = open.side === "BUY" ? c.low <= open.sl : c.high >= open.sl;
      const hitTp = open.side === "BUY" ? c.high >= open.tp : c.low <= open.tp;
      const timed = i - open.bar >= cfg.hold;
      if (hitSl || hitTp || timed) {
        let exit = c.close, reason = "time";
        if (hitSl) { exit = open.sl; reason = "sl"; }
        else if (hitTp) { exit = open.tp; reason = "tp"; }
        const rr = open.side === "BUY" ? (exit - open.entry) / open.risk : (open.entry - exit) / open.risk;
        trades.push({ r: rr, reason });
        open = null;
      }
      continue;
    }
    const s = sess(c.time);
    if (cfg.onlyOverlap && s !== "overlap") continue;
    if (!cfg.onlyOverlap && (s === "off" || s === "thin")) continue;
    const fast = e20[i], slow = e50[i], rsiNow = r[i], atrNow = a[i];
    if (fast == null || slow == null || rsiNow == null || !atrNow) continue;
    const prev = candles[i - 1];
    let side = null;
    if (cfg.mode === "reversion") {
      if (fast > slow && rsiNow <= cfg.rsiBuy && c.close > slow && prev.close < prev.open && c.close > c.open)
        side = "BUY";
      if (fast < slow && rsiNow >= cfg.rsiSell && c.close < slow && prev.close > prev.open && c.close < c.open)
        side = "SELL";
    } else {
      if (fast > slow && rsiNow >= 50 && rsiNow <= 65 && c.close > c.open && Math.abs(c.close - fast) <= atrNow * 0.4)
        side = "BUY";
      if (fast < slow && rsiNow <= 50 && rsiNow >= 35 && c.close < c.open && Math.abs(c.close - fast) <= atrNow * 0.4)
        side = "SELL";
    }
    if (!side) continue;
    const swingLo = Math.min(c.low, prev.low, candles[i - 2].low);
    const swingHi = Math.max(c.high, prev.high, candles[i - 2].high);
    const pad = Math.max(spread * 2, atrNow * 0.1);
    const sl = side === "BUY" ? swingLo - pad : swingHi + pad;
    const risk = Math.abs(c.close - sl);
    if (risk < atrNow * 0.4 || risk > atrNow * 2.2) continue;
    const entry = side === "BUY" ? c.close + spread / 2 : c.close - spread / 2;
    const tp = side === "BUY" ? entry + risk * cfg.rr : entry - risk * cfg.rr;
    open = { side, entry, sl, tp, risk, bar: i };
  }
  return trades;
}

function pack(trades) {
  if (!trades.length) return { n: 0, win: 0, ev: 0 };
  const w = trades.filter((t) => t.r > 0).length;
  return {
    n: trades.length,
    win: Number(((w / trades.length) * 100).toFixed(1)),
    ev: Number((trades.reduce((s, t) => s + t.r, 0) / trades.length).toFixed(3)),
  };
}

const cache = {};
for (const [id, y, sp] of MARKETS) {
  try { cache[id] = { candles: await fetchYahoo(y), spread: sp }; }
  catch (e) { cache[id] = { error: String(e.message || e) }; }
  await new Promise((r) => setTimeout(r, 150));
}

const configs = [
  { name: "rev_0.6R_RSI40", mode: "reversion", rr: 0.6, hold: 6, rsiBuy: 42, rsiSell: 58, onlyOverlap: true },
  { name: "rev_0.8R_RSI40", mode: "reversion", rr: 0.8, hold: 8, rsiBuy: 42, rsiSell: 58, onlyOverlap: true },
  { name: "rev_1R_RSI38", mode: "reversion", rr: 1.0, hold: 8, rsiBuy: 38, rsiSell: 62, onlyOverlap: true },
  { name: "rev_0.7R_allSess", mode: "reversion", rr: 0.7, hold: 6, rsiBuy: 40, rsiSell: 60, onlyOverlap: false },
  { name: "trend_0.6R_ov", mode: "trend", rr: 0.6, hold: 6, rsiBuy: 40, rsiSell: 60, onlyOverlap: true },
  { name: "trend_0.8R_ov", mode: "trend", rr: 0.8, hold: 8, rsiBuy: 40, rsiSell: 60, onlyOverlap: true },
  { name: "rev_0.5R_RSI35", mode: "reversion", rr: 0.5, hold: 5, rsiBuy: 35, rsiSell: 65, onlyOverlap: true },
];

const out = [];
for (const cfg of configs) {
  const all = [];
  for (const [id] of MARKETS) {
    const row = cache[id];
    if (!row?.candles) continue;
    all.push(...run(row.candles, row.spread, cfg));
  }
  out.push({ name: cfg.name, ...pack(all) });
}
out.sort((a, b) => b.win - a.win);
console.log(JSON.stringify(out, null, 2));
