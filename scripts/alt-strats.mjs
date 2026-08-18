const FX = [
  ["EURUSD", "EURUSD=X", 0.00008],
  ["GBPUSD", "GBPUSD=X", 0.00012],
];
const IDX = [
  ["US500", "^GSPC", 0.4],
  ["GER40", "^GDAXI", 1.2],
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
  return {
    hour: Number.parseInt(g("hour"), 10) || 0,
    day: `${g("year")}-${g("month")}-${g("day")}`,
    year: Number.parseInt(g("year"), 10),
    weekend: g("weekday").toLowerCase().startsWith("sat") || g("weekday").toLowerCase().startsWith("sun"),
  };
}

async function fetchYahoo(symbol, interval, range) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
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

function settle(h, i0, side, entry, sl, tp, risk, hold) {
  let curSl = sl, be = false;
  for (let j = i0 + 1; j < h.length && j <= i0 + hold; j++) {
    const c = h[j];
    const fav = side === "BUY" ? c.high - entry : entry - c.low;
    if (!be && fav >= risk * 0.4) { curSl = entry; be = true; }
    if (side === "BUY" ? c.high >= tp : c.low <= tp) return { r: 1, reason: "tp", end: c.time };
    if (side === "BUY" ? c.low <= curSl : c.high >= curSl) {
      const r = side === "BUY" ? (curSl - entry) / risk : (entry - curSl) / risk;
      return { r, reason: be ? "be" : "sl", end: c.time };
    }
  }
  const last = h[Math.min(i0 + hold, h.length - 1)];
  return { r: side === "BUY" ? (last.close - entry) / risk : (entry - last.close) / risk, reason: "time", end: last.time };
}

function sim(trades) {
  trades = [...trades].sort((a, b) => a.time - b.time);
  let eq = 1000, busy = 0, day = "", dp = 0, dn = 0, st = 0;
  const out = [];
  for (const t of trades) {
    if (t.time < busy) continue;
    if (t.day !== day) { day = t.day; dp = 0; dn = 0; st = 0; }
    if (dp <= -eq * 0.02 || st >= 2 || dn >= 3) continue;
    const stake = Math.min(10, eq * 0.01);
    if (stake < 5) break;
    const pnl = t.r * stake;
    eq += pnl; dp += pnl; dn++; st = t.r < -0.05 ? st + 1 : 0;
    busy = t.end;
    out.push({ ...t, pnl, eq, y: t.year });
  }
  const split = (ys) => {
    const xs = out.filter((x) => ys.includes(x.y));
    if (!xs.length) return { n: 0, pnl: 0, win: 0, ev: 0 };
    const w = xs.filter((x) => x.r > 0.05).length;
    return {
      n: xs.length,
      pnl: +xs.reduce((s, x) => s + x.pnl, 0).toFixed(2),
      win: +((w / xs.length) * 100).toFixed(1),
      ev: +(xs.reduce((s, x) => s + x.r, 0) / xs.length).toFixed(3),
    };
  };
  return { all: split([2024, 2025, 2026]), y24: split([2024]), oos: split([2025, 2026]), end: out.at(-1)?.eq ?? 1000 };
}

async function load(list, interval, range) {
  const books = {};
  for (const [id, y, sp] of list) {
    books[id] = { h: await fetchYahoo(y, interval, range), sp };
    console.error("ok", id, books[id].h.length);
    await new Promise((r) => setTimeout(r, 160));
  }
  return books;
}

function asiaBreak(books) {
  const trades = [];
  for (const id of Object.keys(books)) {
    const { h, sp } = books[id];
    const byDay = new Map();
    for (const c of h) {
      const s = L(c.time);
      if (s.weekend) continue;
      if (!byDay.has(s.day)) byDay.set(s.day, []);
      byDay.get(s.day).push({ ...c, hour: s.hour, year: s.year, day: s.day });
    }
    for (const bars of byDay.values()) {
      const asia = bars.filter((b) => b.hour >= 0 && b.hour < 8);
      if (asia.length < 3) continue;
      const hi = Math.max(...asia.map((b) => b.high));
      const lo = Math.min(...asia.map((b) => b.low));
      const rng = hi - lo;
      if (rng <= 0) continue;
      let taken = false;
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        if (b.hour < 11 || b.hour >= 17 || taken) continue;
        const idx = h.findIndex((x) => x.time === b.time);
        if (idx < 2) continue;
        let side = null;
        if (b.close > hi && b.close > b.open) side = "BUY";
        if (b.close < lo && b.close < b.open) side = "SELL";
        if (!side) continue;
        const sl = side === "BUY" ? lo : hi;
        const risk = Math.abs(b.close - sl);
        if (risk < rng * 0.3 || risk > rng * 2.5) continue;
        if (sp / risk > 0.08) continue;
        const entry = side === "BUY" ? b.close + sp / 2 : b.close - sp / 2;
        const tp = side === "BUY" ? entry + risk : entry - risk;
        const res = settle(h, idx, side, entry, sl, tp, risk, 10);
        trades.push({ time: b.time, day: b.day, year: b.year, ...res });
        taken = true;
      }
    }
  }
  return trades;
}

function rsiFade(books) {
  const trades = [];
  for (const id of Object.keys(books)) {
    const { h, sp } = books[id];
    const closes = h.map((c) => c.close);
    const r = rsi(closes);
    const a = atr(h);
    for (let i = 20; i < h.length; i++) {
      const s = L(h[i].time);
      if (s.weekend || s.hour < 14 || s.hour >= 20) continue;
      const rsiNow = r[i], atrNow = a[i];
      if (rsiNow == null || !atrNow) continue;
      let side = null;
      if (rsiNow >= 70 && h[i].close < h[i].open) side = "SELL";
      if (rsiNow <= 30 && h[i].close > h[i].open) side = "BUY";
      if (!side) continue;
      const sl = side === "BUY" ? h[i].low - atrNow * 0.2 : h[i].high + atrNow * 0.2;
      const risk = Math.abs(h[i].close - sl);
      if (risk < atrNow * 0.3 || risk > atrNow * 2) continue;
      const entry = side === "BUY" ? h[i].close + sp / 2 : h[i].close - sp / 2;
      const tp = side === "BUY" ? entry + risk : entry - risk;
      const res = settle(h, i, side, entry, sl, tp, risk, 8);
      trades.push({ time: h[i].time, day: s.day, year: s.year, ...res });
    }
  }
  return trades;
}

const fx = await load(FX, "60m", "2y");
const idx = await load(IDX, "60m", "2y");
console.log(JSON.stringify({
  asiaBreakout_fx: sim(asiaBreak(fx)),
  rsiFade_idx: sim(rsiFade(idx)),
}, null, 2));
