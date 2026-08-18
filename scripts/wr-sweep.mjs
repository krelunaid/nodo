const MARKETS = [
  ["EURUSD", "EURUSD=X", 0.00008],
  ["GBPUSD", "GBPUSD=X", 0.00012],
  ["USDJPY", "JPY=X", 0.012],
  ["XAUUSD", "GC=F", 0.25],
  ["US500", "^GSPC", 0.4],
  ["US100", "^NDX", 0.8],
  ["GER40", "^GDAXI", 1.2],
  ["USOIL", "CL=F", 0.03],
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
    if (open == null || high == null || low == null || close == null) continue;
    candles.push({ time: ts[i] * 1000, open, high, low, close, volume: q.volume?.[i] ?? 0 });
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
  for (let i = 50; i < candles.length; i++) {
    const c = candles[i];
    if (open) {
      const hitSl = open.side === "BUY" ? c.low <= open.sl : c.high >= open.sl;
      const hitTp = open.side === "BUY" ? c.high >= open.tp : c.low <= open.tp;
      const timed = i - open.bar >= cfg.hold;
      if (hitSl || hitTp || timed) {
        let exit = c.close, reason = "time";
        if (hitSl && hitTp) { exit = open.sl; reason = "sl"; }
        else if (hitSl) { exit = open.sl; reason = "sl"; }
        else if (hitTp) { exit = open.tp; reason = "tp"; }
        const rr = open.side === "BUY" ? (exit - open.entry) / open.risk : (open.entry - exit) / open.risk;
        trades.push({ r: rr, reason });
        open = null;
      }
      continue;
    }
    const s = sess(c.time);
    if (cfg.session === "alta" && s !== "overlap" && s !== "london") continue;
    if (cfg.session === "overlap" && s !== "overlap") continue;
    if (s === "off" || s === "thin") continue;
    const fast = e20[i], slow = e50[i], rsiNow = r[i], atrNow = a[i];
    if (fast == null || slow == null || rsiNow == null || !atrNow) continue;
    if ((atrNow / c.close) * 100 < cfg.minAtrPct) continue;
    if (c.high - c.low < atrNow * cfg.minRange) continue;
    const bull = c.close > c.open;
    const bear = c.close < c.open;
    const near = Math.abs(c.close - fast) <= atrNow * cfg.near;
    if (cfg.pullback && !near) continue;
    if (cfg.candle && !((fast > slow && bull) || (fast < slow && bear))) continue;
    let side = null;
    if (fast > slow && rsiNow >= cfg.rsiLo && rsiNow <= cfg.rsiHi && c.close > slow) side = "BUY";
    if (fast < slow && rsiNow <= 100 - cfg.rsiLo && rsiNow >= 100 - cfg.rsiHi && c.close < slow) side = "SELL";
    if (!side) continue;
    if (cfg.noExt && Math.abs((c.close - slow) / slow) * 100 > 1.6) continue;
    const pad = Math.max(spread * 2, atrNow * 0.12);
    const sl = side === "BUY" ? c.low - pad : c.high + pad;
    const risk = Math.abs(c.close - sl);
    if (risk < atrNow * 0.3 || risk > atrNow * 2.5) continue;
    const entry = side === "BUY" ? c.close + spread / 2 : c.close - spread / 2;
    let tp;
    if (cfg.tpMode === "fixed") {
      tp = side === "BUY" ? entry + risk * cfg.rr : entry - risk * cfg.rr;
    } else {
      const look = candles.slice(Math.max(0, i - 10), i);
      const hi = Math.max(...look.map((x) => x.high));
      const lo = Math.min(...look.map((x) => x.low));
      const cap = atrNow * cfg.atrCap;
      tp = side === "BUY" ? Math.min(hi, entry + cap) : Math.max(lo, entry - cap);
      if (Math.abs(tp - entry) < risk * cfg.rr) continue;
    }
    open = { side, entry, sl, tp, risk, bar: i };
  }
  return trades;
}

function pack(trades) {
  if (!trades.length) return { n: 0, win: 0, ev: 0 };
  const w = trades.filter((t) => t.r > 0).length;
  const ev = trades.reduce((s, t) => s + t.r, 0) / trades.length;
  return { n: trades.length, win: Number(((w / trades.length) * 100).toFixed(1)), ev: Number(ev.toFixed(3)) };
}

const cache = {};
for (const [id, y] of MARKETS) {
  try {
    cache[id] = { candles: await fetchYahoo(y), spread: MARKETS.find((m) => m[0] === id)[2] };
  } catch (e) {
    cache[id] = { error: String(e.message || e) };
  }
  await new Promise((r) => setTimeout(r, 160));
}

const configs = [
  { name: "attuale_1.5_struct", session: "alta", pullback: true, candle: true, noExt: true, tpMode: "struct", rr: 1.5, hold: 16, rsiLo: 50, rsiHi: 68, near: 0.45, minAtrPct: 0.08, minRange: 0.7, atrCap: 1.35 },
  { name: "overlap_1R", session: "overlap", pullback: true, candle: true, noExt: true, tpMode: "fixed", rr: 1.0, hold: 10, rsiLo: 50, rsiHi: 62, near: 0.4, minAtrPct: 0.08, minRange: 0.7, atrCap: 1.2 },
  { name: "overlap_0.8R", session: "overlap", pullback: true, candle: true, noExt: true, tpMode: "fixed", rr: 0.8, hold: 8, rsiLo: 50, rsiHi: 60, near: 0.35, minAtrPct: 0.08, minRange: 0.8, atrCap: 1.0 },
  { name: "london_1R_tightRSI", session: "alta", pullback: true, candle: true, noExt: true, tpMode: "fixed", rr: 1.0, hold: 8, rsiLo: 52, rsiHi: 62, near: 0.35, minAtrPct: 0.1, minRange: 0.8, atrCap: 1.1 },
  { name: "1R_noPull_overlap", session: "overlap", pullback: false, candle: true, noExt: true, tpMode: "fixed", rr: 1.0, hold: 8, rsiLo: 50, rsiHi: 65, near: 0.5, minAtrPct: 0.08, minRange: 0.6, atrCap: 1.2 },
  { name: "0.7R_overlap_pull", session: "overlap", pullback: true, candle: true, noExt: true, tpMode: "fixed", rr: 0.7, hold: 6, rsiLo: 50, rsiHi: 58, near: 0.3, minAtrPct: 0.09, minRange: 0.75, atrCap: 1.0 },
  { name: "1.2R_overlap", session: "overlap", pullback: true, candle: true, noExt: true, tpMode: "fixed", rr: 1.2, hold: 10, rsiLo: 50, rsiHi: 64, near: 0.4, minAtrPct: 0.08, minRange: 0.7, atrCap: 1.2 },
];

const out = [];
for (const cfg of configs) {
  const all = [];
  for (const [id] of MARKETS) {
    const row = cache[id];
    if (!row?.candles) continue;
    all.push(...run(row.candles, row.spread, cfg));
  }
  out.push({ name: cfg.name, ...pack(all), tp: all.filter((t) => t.reason === "tp").length, sl: all.filter((t) => t.reason === "sl").length });
}
out.sort((a, b) => b.win - a.win);
console.log(JSON.stringify({ markets: Object.fromEntries(Object.entries(cache).map(([k, v]) => [k, v.candles ? v.candles.length : v.error])), results: out }, null, 2));
