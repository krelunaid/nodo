const MARKETS = [
  ["EURUSD", "EURUSD=X", 0.00008],
  ["GBPUSD", "GBPUSD=X", 0.00012],
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
      i === 0
        ? x.high - x.low
        : Math.max(x.high - x.low, Math.abs(x.high - c[i - 1].close), Math.abs(x.low - c[i - 1].close)),
    ),
    p,
  );
}
function london(ms) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const g = (t) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = g("weekday").toLowerCase();
  const hour = Number.parseInt(g("hour"), 10) || 0;
  const day = `${g("year")}-${g("month")}-${g("day")}`;
  const weekend = wd.startsWith("sat") || wd.startsWith("sun");
  const ok = !weekend && hour >= 11 && hour < 21;
  return { hour, day, ok, year: Number.parseInt(g("year"), 10) };
}

async function fetchYahoo(symbol, interval, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${symbol} ${interval} ${res.status}`);
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

function dailyBias(daily, t) {
  const closes = daily.map((c) => c.close);
  const e50 = ema(closes, 50);
  let last = null;
  for (let i = 0; i < daily.length; i++) {
    if (daily[i].time >= t) break;
    if (e50[i] != null) last = daily[i].close > e50[i] ? "up" : "down";
  }
  return last;
}

function collect(hourly, daily, spread, rr) {
  const closes = hourly.map((c) => c.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const rs = rsi(closes);
  const at = atr(hourly);
  const sigs = [];
  for (let i = 55; i < hourly.length; i++) {
    const c = hourly[i];
    const s = london(c.time);
    if (!s.ok) continue;
    const bias = dailyBias(daily, c.time);
    if (!bias) continue;
    const fast = e20[i], slow = e50[i], rsiNow = rs[i], atrNow = at[i];
    if (fast == null || slow == null || rsiNow == null || !atrNow) continue;
    let side = null;
    if (bias === "up" && fast > slow && rsiNow >= 50 && rsiNow <= 62 && c.close > c.open && Math.abs(c.close - fast) <= atrNow * 0.4)
      side = "BUY";
    if (bias === "down" && fast < slow && rsiNow <= 50 && rsiNow >= 38 && c.close < c.open && Math.abs(c.close - fast) <= atrNow * 0.4)
      side = "SELL";
    if (!side) continue;
    const pad = Math.max(spread * 2, atrNow * 0.1);
    const sl = side === "BUY"
      ? Math.min(c.low, hourly[i - 1].low, hourly[i - 2].low) - pad
      : Math.max(c.high, hourly[i - 1].high, hourly[i - 2].high) + pad;
    const risk = Math.abs(c.close - sl);
    if (risk < atrNow * 0.45 || risk > atrNow * 2.0) continue;
    if (spread / risk > 0.08) continue;
    const entry = side === "BUY" ? c.close + spread / 2 : c.close - spread / 2;
    const tp = side === "BUY" ? entry + risk * rr : entry - risk * rr;
    sigs.push({ time: c.time, year: s.year, day: s.day, side, entry, sl, tp, risk, spread, i });
  }
  return sigs;
}

function settle(hourly, sig, hold = 12) {
  let sl = sig.sl, be = false;
  const start = sig.i;
  for (let j = start + 1; j < hourly.length && j <= start + hold; j++) {
    const c = hourly[j];
    const fav = sig.side === "BUY" ? c.high - sig.entry : sig.entry - c.low;
    if (!be && fav >= sig.risk * 0.4) {
      sl = sig.entry;
      be = true;
    }
    const hitTp = sig.side === "BUY" ? c.high >= sig.tp : c.low <= sig.tp;
    const hitSl = sig.side === "BUY" ? c.low <= sl : c.high >= sl;
    if (hitTp) {
      return { r: sig.side === "BUY" ? (sig.tp - sig.entry) / sig.risk : (sig.entry - sig.tp) / sig.risk, reason: "tp", end: c.time };
    }
    if (hitSl) {
      const r = sig.side === "BUY" ? (sl - sig.entry) / sig.risk : (sig.entry - sl) / sig.risk;
      return { r, reason: be ? "be" : "sl", end: c.time };
    }
  }
  const last = hourly[Math.min(start + hold, hourly.length - 1)];
  const r = sig.side === "BUY" ? (last.close - sig.entry) / sig.risk : (sig.entry - last.close) / sig.risk;
  return { r, reason: "time", end: last.time };
}

function simulate(allSigs, books, startEq = 1000, maxN = 10000) {
  const queue = [...allSigs].sort((a, b) => a.time - b.time);
  let equity = startEq, busy = 0, day = "", dayPnl = 0, dayN = 0, streak = 0;
  const trades = [];
  for (const sig of queue) {
    if (trades.length >= maxN) break;
    if (sig.time < busy) continue;
    if (sig.day !== day) {
      day = sig.day;
      dayPnl = 0;
      dayN = 0;
      streak = 0;
    }
    if (dayPnl <= -equity * 0.02 || streak >= 2 || dayN >= 3) continue;
    const res = settle(books[sig.symbol].hourly, sig, 12);
    const stake = Math.min(10, equity * 0.01);
    if (stake < 5) break;
    const pnl = res.r * stake;
    equity += pnl;
    dayPnl += pnl;
    dayN += 1;
    streak = res.r < -0.05 ? streak + 1 : 0;
    busy = res.end;
    trades.push({ ...res, symbol: sig.symbol, year: sig.year, pnl, equity });
  }
  const wins = trades.filter((t) => t.r > 0.05).length;
  return {
    n: trades.length,
    end: +equity.toFixed(2),
    pnl: +(equity - startEq).toFixed(2),
    win: trades.length ? +((wins / trades.length) * 100).toFixed(1) : 0,
    ev: trades.length ? +(trades.reduce((s, t) => s + t.r, 0) / trades.length).toFixed(3) : 0,
  };
}

const books = {};
for (const [id, y, sp] of MARKETS) {
  const hourly = await fetchYahoo(y, "60m", "2y");
  await new Promise((r) => setTimeout(r, 150));
  const daily = await fetchYahoo(y, "1d", "5y");
  books[id] = { hourly, daily, spread: sp };
  console.error(id, "h", hourly.length, "d", daily.length);
  await new Promise((r) => setTimeout(r, 150));
}

const out = {};
for (const rr of [1.0, 1.2, 1.5]) {
  const all = [];
  for (const [id] of MARKETS) {
    const sigs = collect(books[id].hourly, books[id].daily, books[id].spread, rr).map((s) => ({ ...s, symbol: id }));
    all.push(...sigs);
  }
  const is = all.filter((s) => s.year === 2024);
  const oos = all.filter((s) => s.year >= 2025);
  out[`R${rr}`] = {
    train2024: simulate(is, books),
    test2025_26: simulate(oos, books),
    all: simulate(all, books),
  };
}
console.log(JSON.stringify(out, null, 2));
