function logChoose(n, k) {
  if (k < 0 || k > n) return -Infinity;
  if (k === 0 || k === n) return 0;
  k = Math.min(k, n - k);
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}

function binomCdfLt(n, p, kMax) {
  if (kMax < 0) return 0;
  let acc = 0;
  for (let k = 0; k <= Math.min(n, kMax); k++) {
    acc += Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  }
  return Math.min(1, acc);
}

function erf(x) {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-a * a));
  return s * y;
}

function normCdf(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function stats(n, w) {
  const ev = 3 * w - 1;
  const loseIfWinsLt = n / 3;
  const kMax = Math.ceil(loseIfWinsLt - 1e-12) - 1;
  const pLose =
    n <= 800 ? binomCdfLt(n, w, kMax) : normCdf((n / 3 - 0.5 - n * w) / Math.sqrt(n * w * (1 - w)));
  const meanR = n * ev;
  const varR = n * (w * 4 + (1 - w) * 1 - ev * ev);
  const sdR = Math.sqrt(Math.max(varR, 0));
  const p20 = normCdf((-0.2 * n - 0.5 - meanR) / sdR);
  return {
    n,
    w,
    ev: Number(ev.toFixed(3)),
    pLose: Number((pLose * 100).toFixed(2)),
    meanR: Number(meanR.toFixed(1)),
    sdR: Number(sdR.toFixed(1)),
    pWorse20R: Number((normCdf((-0.2 * n - meanR) / sdR) * 100).toFixed(2)),
  };
}

function monteCarloRuin(n, w, equity, risk, paths = 20000) {
  let down = 0;
  let ruin = 0;
  let half = 0;
  let sumEnd = 0;
  for (let p = 0; p < paths; p++) {
    let eq = equity;
    for (let i = 0; i < n; i++) {
      const stake = Math.min(risk, eq * 0.05);
      if (eq < stake || eq <= equity * 0.2) {
        ruin++;
        eq = Math.min(eq, equity * 0.2);
        break;
      }
      if (Math.random() < w) eq += 2 * stake;
      else eq -= stake;
    }
    sumEnd += eq;
    if (eq < equity) down++;
    if (eq <= equity * 0.5) half++;
  }
  return {
    pDown: Number(((down / paths) * 100).toFixed(2)),
    pHalf: Number(((half / paths) * 100).toFixed(2)),
    pRuin20: Number(((ruin / paths) * 100).toFixed(2)),
    avgEnd: Math.round(sumEnd / paths),
  };
}

const rates = [
  { name: "BTC backtest (30%)", w: 0.3 },
  { name: "Pareggio 2R (33.3%)", w: 1 / 3 },
  { name: "Oro backtest (39%)", w: 0.39 },
  { name: "Se fosse 45%", w: 0.45 },
];

const Ns = [100, 1000, 10000];
const out = {};
for (const r of rates) {
  out[r.name] = {
    evPerTradeR: Number((3 * r.w - 1).toFixed(3)),
    byN: Object.fromEntries(Ns.map((n) => [n, stats(n, r.w)])),
    capital: {
      "1000e_intra50": Object.fromEntries(
        [100, 1000].map((n) => [n, monteCarloRuin(n, r.w, 1000, 50)]),
      ),
      "10000e_intra50": Object.fromEntries(
        Ns.map((n) => [n, monteCarloRuin(n, r.w, 10000, 50, n === 10000 ? 8000 : 20000)]),
      ),
    },
  };
}
console.log(JSON.stringify(out, null, 2));
