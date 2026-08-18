const MARKETS = [
  ["EURUSD", "EURUSD=X", 0.00008],
  ["USDJPY", "JPY=X", 0.012],
  ["XAUUSD", "GC=F", 0.25],
  ["US500", "^GSPC", 0.4],
  ["GER40", "^GDAXI", 1.2],
  ["ETHUSD", "ETH-USD", 1.2],
  ["BTCUSD", "BTC-USD", 12],
];
function ema(v, p) {
  const o = Array(v.length).fill(null);
  const k = 2 / (p + 1);
  if (v.length < p) return o;
  let prev = v.slice(0, p).reduce((a, b) => a + b, 0) / p;
  o[p - 1] = prev;
  for (let i = p; i < v.length; i++) { prev = v[i] * k + prev * (1 - k); o[i] = prev; }
  return o;
}
function sma(v, p) {
  const o = Array(v.length).fill(null); let s = 0;
  for (let i = 0; i < v.length; i++) { s += v[i]; if (i >= p) s -= v[i - p]; if (i >= p - 1) o[i] = s / p; }
  return o;
}
function rsi(v, p = 14) {
  const o = Array(v.length).fill(null);
  if (v.length <= p) return o;
  let g = 0, l = 0;
  for (let i = 1; i <= p; i++) { const d = v[i] - v[i - 1]; if (d >= 0) g += d; else l -= d; }
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
  return sma(c.map((x, i) => i === 0 ? x.high - x.low : Math.max(x.high - x.low, Math.abs(x.high - c[i - 1].close), Math.abs(x.low - c[i - 1].close))), p);
}
function sess(ms) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", hour: "numeric", hour12: false }).formatToParts(new Date(ms));
  const wd = (parts.find((p) => p.type === "weekday")?.value ?? "").toLowerCase();
  const hour = Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  if (wd.startsWith("sat") || wd.startsWith("sun")) return "off";
  if (hour >= 13 && hour < 17) return "ov";
  if (hour >= 8 && hour < 21) return "ok";
  return "thin";
}
async function fetchYahoo(symbol) {
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=15m&range=1mo`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  const r = json.chart?.result?.[0]; const q = r?.indicators?.quote?.[0]; const ts = r?.timestamp ?? [];
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    if ([q.open[i], q.high[i], q.low[i], q.close[i]].some((x) => x == null)) continue;
    out.push({ time: ts[i] * 1000, open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i] });
  }
  return out;
}
function run(candles, spread, rr, beAt, hold, onlyOv) {
  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20), e50 = ema(closes, 50), rs = rsi(closes), at = atr(candles);
  const trades = [];
  let open = null;
  for (let i = 55; i < candles.length; i++) {
    const c = candles[i];
    if (open) {
      const fav = open.side === "BUY" ? c.high - open.entry : open.entry - c.low;
      if (!open.be && fav >= open.risk * beAt) {
        open.sl = open.entry + (open.side === "BUY" ? spread : -spread);
        open.be = true;
      }
      const hitSl = open.side === "BUY" ? c.low <= open.sl : c.high >= open.sl;
      const hitTp = open.side === "BUY" ? c.high >= open.tp : c.low <= open.tp;
      if (hitSl || hitTp || i - open.bar >= hold) {
        let exit = c.close, reason = "time";
        if (hitTp) { exit = open.tp; reason = "tp"; }
        else if (hitSl) { exit = open.sl; reason = open.be ? "be" : "sl"; }
        const r = open.side === "BUY" ? (exit - open.entry) / open.risk : (open.entry - exit) / open.risk;
        trades.push({ r, reason });
        open = null;
      }
      continue;
    }
    const s = sess(c.time);
    if (s === "off" || s === "thin") continue;
    if (onlyOv && s !== "ov") continue;
    const fast = e20[i], slow = e50[i], rsiNow = rs[i], atrNow = at[i];
    if (fast == null || slow == null || rsiNow == null || !atrNow) continue;
    let side = null;
    if (fast > slow && rsiNow >= 50 && rsiNow <= 64 && c.close > c.open && Math.abs(c.close - fast) <= atrNow * 0.4) side = "BUY";
    if (fast < slow && rsiNow <= 50 && rsiNow >= 36 && c.close < c.open && Math.abs(c.close - fast) <= atrNow * 0.4) side = "SELL";
    if (!side) continue;
    const sl = side === "BUY" ? Math.min(c.low, candles[i - 1].low, candles[i - 2].low) - Math.max(spread * 2, atrNow * 0.1)
      : Math.max(c.high, candles[i - 1].high, candles[i - 2].high) + Math.max(spread * 2, atrNow * 0.1);
    const risk = Math.abs(c.close - sl);
    if (risk < atrNow * 0.4 || risk > atrNow * 2.2) continue;
    const entry = side === "BUY" ? c.close + spread / 2 : c.close - spread / 2;
    const tp = side === "BUY" ? entry + risk * rr : entry - risk * rr;
    open = { side, entry, sl, tp, risk, bar: i, be: false };
  }
  return trades;
}
function pack(trades) {
  if (!trades.length) return { n: 0 };
  const win = trades.filter((t) => t.r > 0.05).length;
  const be = trades.filter((t) => t.r >= -0.05 && t.r <= 0.05).length;
  const ev = trades.reduce((s, t) => s + t.r, 0) / trades.length;
  return { n: trades.length, win: +(win / trades.length * 100).toFixed(1), be: +(be / trades.length * 100).toFixed(1), nonLoss: +((win + be) / trades.length * 100).toFixed(1), ev: +ev.toFixed(3) };
}
const cache = {};
for (const [id, y, sp] of MARKETS) {
  try { cache[id] = { c: await fetchYahoo(y), sp }; } catch (e) { cache[id] = null; }
  await new Promise((r) => setTimeout(r, 140));
}
const cfgs = [
  [0.6, 0.3, 6, true],
  [0.7, 0.35, 8, true],
  [0.8, 0.4, 8, true],
  [1.0, 0.45, 10, true],
  [0.7, 0.35, 8, false],
  [0.8, 0.4, 8, false],
];
const out = [];
for (const [rr, be, hold, ov] of cfgs) {
  const all = [];
  for (const id of Object.keys(cache)) {
    if (!cache[id]) continue;
    all.push(...run(cache[id].c, cache[id].sp, rr, be, hold, ov));
  }
  out.push({ rr, be, hold, ov, ...pack(all) });
}
out.sort((a, b) => b.win - a.win);
console.log(JSON.stringify(out, null, 2));
