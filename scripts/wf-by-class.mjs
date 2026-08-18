const CLASSES = {
  forex: [["EURUSD", "EURUSD=X", 0.00008], ["GBPUSD", "GBPUSD=X", 0.00012]],
  index: [["US500", "^GSPC", 0.4], ["GER40", "^GDAXI", 1.2]],
  oro: [["XAUUSD", "GC=F", 0.25]],
  crypto: [["ETHUSD", "ETH-USD", 1.2], ["BTCUSD", "BTC-USD", 12]],
};

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
      i === 0 ? x.high - x.low : Math.max(x.high - x.low, Math.abs(x.high - c[i - 1].close), Math.abs(x.low - c[i - 1].close)),
    ),
    p,
  );
}
function L(ms) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "short", hour: "numeric", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(ms));
  const g = (t) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = Number.parseInt(g("hour"), 10) || 0;
  const wd = g("weekday").toLowerCase();
  return {
    hour, day: `${g("year")}-${g("month")}-${g("day")}`, year: Number.parseInt(g("year"), 10),
    weekend: wd.startsWith("sat") || wd.startsWith("sun"),
    okHour: hour >= 11 && hour < 21,
  };
}

async function fetchYahoo(symbol) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=60m&range=2y`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  );
  if (!res.ok) throw new Error(`${symbol} ${res.status}`);
  const json = await res.json();
  const r = json.chart?.result?.[0];
  const q = r?.indicators?.quote?.[0];
  const ts = r?.timestamp ?? [];
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    if ([q.open[i], q.high[i], q.low[i], q.close[i]].some((x) => x == null)) continue;
    out.push({ time: ts[i] * 1000, open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i] });
  }
  return out;
}

function tradesFor(h, spread0, kind) {
  const spread = spread0 * 1.5;
  const closes = h.map((c) => c.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const rs = rsi(closes);
  const at = atr(h);
  const out = [];
  for (let i = 55; i < h.length; i++) {
    const c = h[i];
    const s = L(c.time);
    if (kind !== "crypto" && (s.weekend || !s.okHour)) continue;
    const fast = e20[i], slow = e50[i], rsiNow = rs[i], atrNow = at[i];
    if (fast == null || slow == null || rsiNow == null || !atrNow) continue;
    if (spread / atrNow > (kind === "crypto" ? 0.12 : 0.18)) continue;
    let side = null;
    if (kind === "index" || kind === "crypto") {
      if (rsiNow <= 32 && c.close > c.open) side = "BUY";
      if (rsiNow >= 68 && c.close < c.open) side = "SELL";
    } else {
      if (fast > slow && rsiNow >= 50 && rsiNow <= 62 && c.close > c.open && Math.abs(c.close - fast) <= atrNow * 0.4) side = "BUY";
      if (fast < slow && rsiNow <= 50 && rsiNow >= 38 && c.close < c.open && Math.abs(c.close - fast) <= atrNow * 0.4) side = "SELL";
    }
    if (!side) continue;
    const slip = atrNow * 0.12;
    const pad = Math.max(spread * 2, atrNow * 0.1);
    const sl = side === "BUY"
      ? Math.min(c.low, h[i - 1].low, h[i - 2].low) - pad
      : Math.max(c.high, h[i - 1].high, h[i - 2].high) + pad;
    const risk = Math.abs(c.close - sl);
    if (risk < atrNow * 0.45 || risk > atrNow * 2) continue;
    const entry = side === "BUY" ? c.close + spread / 2 + slip : c.close - spread / 2 - slip;
    const tp = side === "BUY" ? entry + risk : entry - risk;
    let curSl = sl, be = false, done = null;
    for (let j = i + 1; j < h.length && j <= i + 12; j++) {
      const b = h[j];
      const fav = side === "BUY" ? b.high - entry : entry - b.low;
      if (!be && fav >= risk * 0.4) { curSl = entry; be = true; }
      if (side === "BUY" ? b.high >= tp : b.low <= tp) { done = { r: 1, y: s.year, day: s.day, time: c.time, end: b.time }; break; }
      if (side === "BUY" ? b.low <= curSl : b.high >= curSl) {
        const r = side === "BUY" ? (curSl - entry) / risk : (entry - curSl) / risk;
        done = { r, y: s.year, day: s.day, time: c.time, end: b.time };
        break;
      }
    }
    if (!done) {
      const last = h[Math.min(i + 12, h.length - 1)];
      const r = side === "BUY" ? (last.close - entry) / risk : (entry - last.close) / risk;
      done = { r, y: s.year, day: s.day, time: c.time, end: last.time };
    }
    out.push(done);
  }
  return out;
}

function sim(list) {
  list = [...list].sort((a, b) => a.time - b.time);
  let eq = 1000, busy = 0, day = "", dp = 0, dn = 0, st = 0;
  const closed = [];
  for (const t of list) {
    if (t.time < busy) continue;
    if (t.day !== day) { day = t.day; dp = 0; dn = 0; st = 0; }
    if (dp <= -eq * 0.02 || st >= 2 || dn >= 3) continue;
    const stake = Math.min(10, eq * 0.01);
    if (stake < 5) break;
    const pnl = t.r * stake;
    eq += pnl; dp += pnl; dn++; st = t.r < -0.05 ? st + 1 : 0;
    busy = t.end;
    closed.push({ ...t, pnl });
  }
  const part = (ys) => {
    const xs = closed.filter((x) => ys.includes(x.y));
    if (!xs.length) return { n: 0, pnl: 0, ev: 0 };
    return {
      n: xs.length,
      pnl: +xs.reduce((s, x) => s + x.pnl, 0).toFixed(2),
      ev: +(xs.reduce((s, x) => s + x.r, 0) / xs.length).toFixed(3),
    };
  };
  return { y24: part([2024]), oos: part([2025, 2026]), all: part([2024, 2025, 2026]), end: +eq.toFixed(2) };
}

const report = {};
for (const [cls, mkts] of Object.entries(CLASSES)) {
  const bag = [];
  for (const [id, y, sp] of mkts) {
    try {
      const h = await fetchYahoo(y);
      bag.push(...tradesFor(h, sp, cls === "oro" ? "metal" : cls));
      console.error(cls, id, h.length);
    } catch (e) {
      console.error(cls, id, e.message);
    }
    await new Promise((r) => setTimeout(r, 160));
  }
  report[cls] = sim(bag);
}
console.log(JSON.stringify(report, null, 2));
