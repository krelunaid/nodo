function path(n, w, be, R, rng) {
  // outcomes: win +R, scratch 0 with p=be among losers-ish, else -1
  // Use: pWin, pBe, pLose = 1-pWin-pBe
  let eq = 0, peak = 0, maxDd = 0;
  for (let i = 0; i < n; i++) {
    const u = rng();
    if (u < w) eq += R;
    else if (u < w + be) eq += 0;
    else eq -= 1;
    if (eq > peak) peak = eq;
    maxDd = Math.max(maxDd, peak - eq);
  }
  return { eq, maxDd };
}
function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pct(a, p) {
  a.sort((x, y) => x - y);
  const i = (a.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? a[lo] : a[lo] * (hi - i) + a[hi] * (i - lo);
}

function analyze(n, w, be, R, paths = 20000) {
  const pL = 1 - w - be;
  const ev = w * R + be * 0 + pL * -1;
  const ends = [], dds = [];
  let down = 0;
  for (let i = 0; i < paths; i++) {
    const row = path(n, w, be, R, mulberry(9000 + i * 17 + n));
    ends.push(row.eq);
    dds.push(row.maxDd);
    if (row.eq < 0) down++;
  }
  return {
    n, R,
    expectancyR: +ev.toFixed(3),
    pDown: +((down / paths) * 100).toFixed(1),
    endP50: +pct(ends, 0.5).toFixed(1),
    endP05: +pct(ends, 0.05).toFixed(1),
    endP95: +pct(ends, 0.95).toFixed(1),
    ddP50: +pct(dds, 0.5).toFixed(1),
    ddP80: +pct(dds, 0.8).toFixed(1),
    ddP95: +pct(dds, 0.95).toFixed(1),
  };
}

// From last BE test (overlap 0.7R): win 57.8%, scratch ~8.5%, lose ~33.7%
const W = 0.578, BE = 0.085, R = 0.7;

const cases = [];
for (const n of [20, 50, 100, 171, 1000]) {
  cases.push(analyze(n, W, BE, R, n >= 1000 ? 12000 : 20000));
}

const stakes = { scalp: 10, intra: 50 };
const euro = {};
for (const [name, stake] of Object.entries(stakes)) {
  euro[name] = {};
  for (const n of [20, 50, 100, 171, 1000]) {
    const ev = W * R - (1 - W - BE);
    euro[name][n] = {
      evTrade: +(ev * stake).toFixed(2),
      evN: +(ev * stake * n).toFixed(0),
    };
  }
}

// month-like: 83 overlap trades from test, scale to 10k/1k with 10€ (only scalp allowed on 1k)
function money(n, stake, equity0, paths = 15000) {
  const ends = [], dds = [];
  for (let i = 0; i < paths; i++) {
    const rng = mulberry(12000 + i * 31 + n + stake);
    let eq = equity0, peak = eq, maxDd = 0;
    for (let k = 0; k < n; k++) {
      const risk = Math.min(stake, eq * 0.01);
      if (eq < 8) break;
      const u = rng();
      if (u < W) eq += R * risk;
      else if (u < W + BE) eq += 0;
      else eq -= risk;
      if (eq > peak) peak = eq;
      maxDd = Math.max(maxDd, peak - eq);
    }
    ends.push(eq);
    dds.push(maxDd);
  }
  return {
    endP50: Math.round(pct(ends, 0.5)),
    endP05: Math.round(pct(ends, 0.05)),
    endP95: Math.round(pct(ends, 0.95)),
    ddP50: Math.round(pct(dds, 0.5)),
    ddP95: Math.round(pct(dds, 0.95)),
  };
}

console.log(JSON.stringify({
  model: { win: W, scratch: BE, lose: +(1 - W - BE).toFixed(3), R },
  rUnits: cases,
  euroPerTrade: euro,
  accounts: {
    e1000_scalp10_20: money(20, 10, 1000),
    e1000_scalp10_80: money(80, 10, 1000),
    e10000_intra50_80: money(80, 50, 10000),
    e10000_intra50_171: money(171, 50, 10000),
    e10000_intra50_1000: money(1000, 50, 10000),
  },
}, null, 2));
