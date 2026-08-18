function runPath(n, w, R, rng) {
  let eq = 0;
  let peak = 0;
  let maxDd = 0;
  let wins = 0;
  for (let i = 0; i < n; i++) {
    if (rng() < w) {
      eq += R;
      wins++;
    } else {
      eq -= 1;
    }
    if (eq > peak) peak = eq;
    const dd = peak - eq;
    if (dd > maxDd) maxDd = dd;
  }
  return { eq, maxDd, wins };
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

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - i) + sorted[hi] * (i - lo);
}

function analyze(n, w, R, paths = 25000) {
  const ev = R * w - (1 - w);
  const payoffVar = w * R * R + (1 - w) * 1 - ev * ev;
  const dds = [];
  const ends = [];
  let below = 0;
  for (let p = 0; p < paths; p++) {
    const row = runPath(n, w, R, mulberry(1000 + p * 997 + n + Math.round(w * 1000) + R * 10));
    dds.push(row.maxDd);
    ends.push(row.eq);
    if (row.eq < 0) below++;
  }
  dds.sort((a, b) => a - b);
  ends.sort((a, b) => a - b);
  return {
    n,
    w,
    R,
    expectancyR: Number(ev.toFixed(3)),
    pLose: Number(((below / paths) * 100).toFixed(2)),
    endP50: Number(percentile(ends, 0.5).toFixed(1)),
    endP05: Number(percentile(ends, 0.05).toFixed(1)),
    endP95: Number(percentile(ends, 0.95).toFixed(1)),
    ddP50: Number(percentile(dds, 0.5).toFixed(1)),
    ddP80: Number(percentile(dds, 0.8).toFixed(1)),
    ddP95: Number(percentile(dds, 0.95).toFixed(1)),
    theoreticalSd: Number(Math.sqrt(n * payoffVar).toFixed(1)),
  };
}

const cases = [];
for (const R of [1.5, 2]) {
  for (const w of [0.333, 0.39, 0.45, 0.5]) {
    for (const n of [100, 1000]) {
      cases.push(analyze(n, w, R, n === 1000 ? 12000 : 25000));
    }
  }
}

const stakes = { scalp: 10, intradaily: 50, swing: 200 };
const euro = {};
for (const R of [1.5, 2]) {
  euro[R] = {};
  for (const [style, stake] of Object.entries(stakes)) {
    euro[R][style] = {};
    for (const w of [0.333, 0.39, 0.45, 0.5]) {
      const evR = R * w - (1 - w);
      euro[R][style][w] = {
        perTrade: Number((evR * stake).toFixed(2)),
        n100: Number((evR * stake * 100).toFixed(0)),
        n1000: Number((evR * stake * 1000).toFixed(0)),
      };
    }
  }
}

console.log(JSON.stringify({ cases, euro }, null, 2));
