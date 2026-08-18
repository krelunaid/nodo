const MARKETS = [
  ["EURUSD", "EURUSD=X", 0.00008, "fx"],
  ["GBPUSD", "GBPUSD=X", 0.00012, "fx"],
  ["USDJPY", "JPY=X", 0.012, "fx"],
  ["XAUUSD", "GC=F", 0.25, "metal"],
  ["XAGUSD", "SI=F", 0.02, "metal"],
  ["US500", "^GSPC", 0.4, "index"],
  ["US100", "^NDX", 0.8, "index"],
  ["GER40", "^GDAXI", 1.2, "index"],
  ["USOIL", "CL=F", 0.03, "energy"],
  ["BTCUSD", "BTC-USD", 12, "crypto"],
  ["ETHUSD", "ETH-USD", 1.2, "crypto"],
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
function sess(ms) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", weekday: "short", hour: "numeric", hour12: false,
  }).formatToParts(new Date(ms));
  const wd = (parts.find((p) => p.type === "weekday")?.value ?? "").toLowerCase();
  const hour = Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  if (wd.startsWith("sat") || wd.startsWith("sun")) return { id: "off", hour };
  if (hour >= 13 && hour < 17) return { id: "overlap", hour };
  if (hour >= 8 && hour < 13) return { id: "london", hour };
  if (hour >= 17 && hour < 21) return { id: "ny", hour };
  return { id: "thin", hour };
}

async function fetchYahoo(symbol) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=15m&range=1mo`,
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

function collect(candles, spread, kind, symbol) {
  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const rs = rsi(closes);
  const at = atr(candles);
  const trades = [];
  let open = null;
  for (let i = 55; i < candles.length; i++) {
    const c = candles[i];
    if (open) {
      const fav = open.side === "BUY" ? c.high - open.entry : open.entry - c.low;
      if (!open.be && fav >= open.risk * 0.35) {
        open.sl = open.entry + (open.side === "BUY" ? spread : -spread);
        open.be = true;
      }
      const hitSl = open.side === "BUY" ? c.low <= open.sl : c.high >= open.sl;
      const hitTp = open.side === "BUY" ? c.high >= open.tp : c.low <= open.tp;
      if (hitSl || hitTp || i - open.bar >= 8) {
        let exit = c.close, reason = "time";
        if (hitTp) { exit = open.tp; reason = "tp"; }
        else if (hitSl) { exit = open.sl; reason = open.be ? "be" : "sl"; }
        const r = open.side === "BUY" ? (exit - open.entry) / open.risk : (open.entry - exit) / open.risk;
        trades.push({ ...open.meta, r, reason, bars: i - open.bar });
        open = null;
      }
      continue;
    }
    const s = sess(c.time);
    if (s.id === "off" || s.id === "thin") continue;
    const fast = e20[i], slow = e50[i], rsiNow = rs[i], atrNow = at[i];
    if (fast == null || slow == null || rsiNow == null || !atrNow) continue;
    let side = null;
    if (fast > slow && rsiNow >= 50 && rsiNow <= 64 && c.close > c.open && Math.abs(c.close - fast) <= atrNow * 0.4) side = "BUY";
    if (fast < slow && rsiNow <= 50 && rsiNow >= 36 && c.close < c.open && Math.abs(c.close - fast) <= atrNow * 0.4) side = "SELL";
    if (!side) continue;
    const slRaw = side === "BUY"
      ? Math.min(c.low, candles[i - 1].low, candles[i - 2].low)
      : Math.max(c.high, candles[i - 1].high, candles[i - 2].high);
    const pad = Math.max(spread * 2, atrNow * 0.1);
    const sl = side === "BUY" ? slRaw - pad : slRaw + pad;
    const risk = Math.abs(c.close - sl);
    if (risk < atrNow * 0.4 || risk > atrNow * 2.2) continue;
    const entry = side === "BUY" ? c.close + spread / 2 : c.close - spread / 2;
    const tp = side === "BUY" ? entry + risk * 0.7 : entry - risk * 0.7;
    const ext = Math.abs((c.close - slow) / slow) * 100;
    const htfUp = e20[i] > e50[i];
    open = {
      side, entry, sl, tp, risk, bar: i, be: false,
      meta: {
        symbol, kind, side, sess: s.id, hour: s.hour,
        rsi: +rsiNow.toFixed(1),
        ext: +ext.toFixed(2),
        atrPct: +((atrNow / c.close) * 100).toFixed(3),
        spreadR: +(spread / risk).toFixed(3),
        body: +((Math.abs(c.close - c.open) / (c.high - c.low || 1)) * 100).toFixed(0),
        near: +((Math.abs(c.close - fast) / atrNow).toFixed(2)),
        htf: htfUp ? "up" : "down",
      },
    };
  }
  return trades;
}

function bucket(trades, keyFn) {
  const m = new Map();
  for (const t of trades) {
    const k = keyFn(t);
    const row = m.get(k) ?? { n: 0, win: 0, sl: 0, sum: 0 };
    row.n += 1;
    if (t.r > 0.05) row.win += 1;
    if (t.reason === "sl") row.sl += 1;
    row.sum += t.r;
    m.set(k, row);
  }
  return [...m.entries()]
    .map(([k, v]) => ({
      k, n: v.n,
      win: +((v.win / v.n) * 100).toFixed(1),
      ev: +(v.sum / v.n).toFixed(3),
      sl: v.sl,
    }))
    .filter((r) => r.n >= 6)
    .sort((a, b) => a.ev - b.ev);
}

const all = [];
for (const [id, y, sp, kind] of MARKETS) {
  try {
    const c = await fetchYahoo(y);
    all.push(...collect(c, sp, kind, id));
  } catch (e) {
    console.error(id, e.message);
  }
  await new Promise((r) => setTimeout(r, 150));
}

const pack = (trades) => {
  if (!trades.length) return { n: 0, win: 0, ev: 0 };
  return {
    n: trades.length,
    win: +((trades.filter((t) => t.r > 0.05).length / trades.length) * 100).toFixed(1),
    ev: +(trades.reduce((s, t) => s + t.r, 0) / trades.length).toFixed(3),
  };
};

const cuts = {
  noEnergy: all.filter((t) => t.kind !== "energy"),
  noMetal: all.filter((t) => t.kind !== "metal"),
  noNy: all.filter((t) => t.sess !== "ny"),
  overlapOnly: all.filter((t) => t.sess === "overlap"),
  rsiMid: all.filter((t) => t.rsi >= 45 && t.rsi <= 60 || t.rsi <= 55 && t.rsi >= 40),
  lowSpread: all.filter((t) => t.spreadR <= 0.12),
  noHighExt: all.filter((t) => t.ext <= 0.8),
  fatBody: all.filter((t) => t.body >= 45),
  combo: all.filter((t) =>
    t.kind !== "energy" &&
    t.sess !== "ny" &&
    t.spreadR <= 0.12 &&
    t.ext <= 1.0 &&
    t.body >= 40 &&
    !(t.kind === "metal" && t.sess !== "overlap")
  ),
};

console.log(JSON.stringify({
  overall: pack(all),
  bySymbol: bucket(all, (t) => t.symbol),
  byKind: bucket(all, (t) => t.kind),
  bySess: bucket(all, (t) => t.sess),
  byHour: bucket(all, (t) => String(t.hour)),
  byRsi: bucket(all, (t) => (t.rsi < 42 ? "rsi<42" : t.rsi > 62 ? "rsi>62" : "rsi42-62")),
  byExt: bucket(all, (t) => (t.ext > 1 ? "ext>1%" : "ext<=1%")),
  bySpreadR: bucket(all, (t) => (t.spreadR > 0.1 ? "spread>10%" : "spread<=10%")),
  byBody: bucket(all, (t) => (t.body < 40 ? "doji" : "body")),
  cuts: Object.fromEntries(Object.entries(cuts).map(([k, v]) => [k, pack(v)])),
}, null, 2));
