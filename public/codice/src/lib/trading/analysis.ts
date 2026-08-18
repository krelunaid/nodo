import type { Candle } from "./candles";
import { lastValid } from "./candles";
import { atr, ema, last, rsi, sma, vwap } from "./indicators";
import type { Instrument } from "./instruments";
import { currentFxSession, type FxSession } from "./session";

export type AnalysisStyle = "scalp" | "intraday" | "swing";
export type FactorTone = "long" | "short" | "neutral" | "block";

export type Check = {
  id: "trend" | "momentum" | "volume" | "range";
  question: string;
  pass: boolean;
  value: string;
  note: string;
};

export type SetupId =
  | "swing-long"
  | "swing-short"
  | "pullback-long"
  | "pullback-short"
  | "scalp-long"
  | "scalp-short"
  | "none";

export type MarketAnalysis = {
  price: number;
  atr: number;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  rsi: number | null;
  vwap: number | null;
  volumeRatio: number | null;
  extensionPct: number | null;
  session: FxSession;
  structure: { lastHigh: number | null; lastLow: number | null };
  signal: { high: number; low: number };
  checks: Check[];
  setup: { id: SetupId; label: string };
  factors: Array<{
    id: string;
    label: string;
    tone: FactorTone;
    score: number;
    value: string;
    note: string;
  }>;
  bias: FactorTone;
  quality: number;
  summary: string;
  allowed: { long: boolean; short: boolean };
  blockReason: string | null;
};

function periods(style: AnalysisStyle) {
  if (style === "scalp") return { fast: 9, slow: 21, volMult: 1.2 };
  if (style === "swing") return { fast: 20, slow: 50, volMult: 1.5 };
  return { fast: 20, slow: 50, volMult: 1.2 };
}

export function analyzeMarket(
  candles: Candle[],
  higher: Candle[],
  instrument: Instrument,
  style: AnalysisStyle = "intraday",
): MarketAnalysis | null {
  const lastCandle = lastValid(candles);
  if (!lastCandle || candles.length < 30) return null;

  const { fast, slow, volMult } = periods(style);
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const fastSeries = ema(closes, fast);
  const slowSeries = ema(closes, slow);
  const rsiSeries = rsi(closes, 14);
  const atrSeries = atr(candles, 14);
  const volAvg = sma(volumes, 20);
  const vwapSeries = vwap(candles);
  const session = currentFxSession();

  const price = lastCandle.close;
  const eFast = last(fastSeries);
  const eSlow = last(slowSeries);
  const rsiNow = last(rsiSeries);
  const atrNow = last(atrSeries) ?? price * 0.001;
  const vwapNow = last(vwapSeries);
  const volNow = lastCandle.volume;
  const volMean = last(volAvg);
  const volumeRatio = volMean && volMean > 0 ? volNow / volMean : null;
  const extensionPct =
    eSlow && eSlow !== 0 ? ((price - eSlow) / eSlow) * 100 : null;

  const htfCloses = higher.map((c) => c.close);
  const htfFast = last(ema(htfCloses, 20));
  const htfSlow = last(ema(htfCloses, 50));
  const htfUp = htfFast != null && htfSlow != null && htfFast > htfSlow;
  const htfDown = htfFast != null && htfSlow != null && htfFast < htfSlow;

  const trendUp = eFast != null && eSlow != null && eFast > eSlow;
  const trendDown = eFast != null && eSlow != null && eFast < eSlow;
  const rsiLong = rsiNow != null && rsiNow >= 50;
  const rsiShort = rsiNow != null && rsiNow <= 50;
  const rsiNear50 = rsiNow != null && rsiNow >= 45 && rsiNow <= 55;
  const volOk = volumeRatio != null && volumeRatio >= volMult;
  const atrPct = (atrNow / price) * 100;
  const compressed = atrPct < 0.08;
  const stretched = extensionPct != null && Math.abs(extensionPct) > 1.8;
  const nearFast =
    eFast != null && Math.abs(price - eFast) <= atrNow * 0.45;
  const aboveSlow = eSlow != null && price > eSlow;
  const belowSlow = eSlow != null && price < eSlow;
  const aboveVwap = vwapNow != null && price > vwapNow;
  const belowVwap = vwapNow != null && price < vwapNow;

  const marketClosed = instrument.session !== "crypto" && !session.open;

  const checks: Check[] = [
    {
      id: "trend",
      question: "Trend giusto?",
      pass: style === "scalp" ? trendUp || trendDown : trendUp || trendDown,
      value:
        eFast != null && eSlow != null
          ? `EMA${fast} ${eFast > eSlow ? ">" : "<"} EMA${slow}`
          : "in attesa",
      note: trendUp
        ? "Solo long. Non shortare un trend rialzista perché l'RSI è alto."
        : trendDown
          ? "Solo short, o resta fuori."
          : "Medie intrecciate: niente direzione, niente trade.",
    },
    {
      id: "momentum",
      question: "Momentum giusto?",
      pass:
        style === "scalp"
          ? rsiNear50 || (trendUp && rsiLong) || (trendDown && rsiShort)
          : (trendUp && rsiLong) || (trendDown && rsiShort),
      value: rsiNow != null ? `RSI ${rsiNow.toFixed(1)}` : "n/d",
      note:
        style === "scalp"
          ? "In scalp l'RSI deve stare vicino a 50, non agli estremi."
          : "Long solo con RSI ≥ 50 nel trend rialzista. Short solo con RSI ≤ 50.",
    },
    {
      id: "volume",
      question: "Volume giusto?",
      pass: volOk || instrument.session === "fx",
      value:
        volumeRatio != null
          ? `${volumeRatio.toFixed(2)}× (soglia ${volMult.toFixed(1)}×)`
          : instrument.session === "fx"
            ? "FX: volume parziale"
            : "n/d",
      note: volOk
        ? "La candela ha partecipazione. Non è un tick vuoto."
        : instrument.session === "fx"
          ? "Sul FX spot il volume è indicativo. Non è un oracolo."
          : `Serve almeno ${volMult}× la media. Senza volume i breakout mentono.`,
    },
    {
      id: "range",
      question: "Rischio accettabile?",
      pass: !compressed && !marketClosed && !stretched,
      value: compressed
        ? `ATR ${atrPct.toFixed(2)}% · compresso`
        : stretched
          ? `Estensione ${extensionPct?.toFixed(2)}%`
          : `ATR ${atrPct.toFixed(2)}%`,
      note: marketClosed
        ? session.note
        : compressed
          ? "Volatilità morta: lo spread mangia il trade. ATR filtra i falsi breakout."
          : stretched
            ? "Prezzo troppo lontano dalla media. Non inseguire."
            : "C'è spazio per uno stop sotto la candela e un target a 2R.",
    },
  ];

  if (marketClosed) {
    checks[0] = { ...checks[0], pass: false, note: session.note };
    checks[3] = { ...checks[3], pass: false };
  }
  if (!trendUp && !trendDown) checks[0] = { ...checks[0], pass: false };

  let setup: { id: SetupId; label: string } = { id: "none", label: "Nessun setup" };

  if (!marketClosed && !compressed) {
    if (style === "scalp" && trendUp && aboveVwap && (rsiNear50 || rsiLong) && volOk) {
      setup = { id: "scalp-long", label: "Scalp long · EMA 9/21 + VWAP" };
    } else if (style === "scalp" && trendDown && belowVwap && (rsiNear50 || rsiShort) && volOk) {
      setup = { id: "scalp-short", label: "Scalp short · EMA 9/21 + VWAP" };
    } else if (trendUp && aboveSlow && rsiLong && nearFast && volOk) {
      setup = { id: "pullback-long", label: "Pullback long · rientro su EMA" };
    } else if (trendDown && belowSlow && rsiShort && nearFast && volOk) {
      setup = { id: "pullback-short", label: "Pullback short · rientro su EMA" };
    } else if (style !== "scalp" && trendUp && aboveSlow && rsiLong && volOk && htfUp) {
      setup = { id: "swing-long", label: "Swing long · EMA 20>50 + RSI>50 + volume" };
    } else if (style !== "scalp" && trendDown && belowSlow && rsiShort && volOk && htfDown) {
      setup = { id: "swing-short", label: "Swing short · EMA 20<50 + RSI<50 + volume" };
    }
  }

  const fourYes = checks.every((c) => c.pass);
  const longOk =
    !marketClosed &&
    fourYes &&
    trendUp &&
    (style === "scalp" ? aboveVwap : true) &&
    (setup.id.endsWith("long") || setup.id === "none" && trendUp && rsiLong && volOk);
  const shortOk =
    !marketClosed &&
    fourYes &&
    trendDown &&
    (style === "scalp" ? belowVwap : true) &&
    (setup.id.endsWith("short") || setup.id === "none" && trendDown && rsiShort && volOk);

  const allowedLong = setup.id.endsWith("long") && fourYes && !marketClosed;
  const allowedShort = setup.id.endsWith("short") && fourYes && !marketClosed;

  let blockReason: string | null = null;
  if (marketClosed) {
    blockReason =
      "Weekend o mercato chiuso. FX, oro e indici non si toccano. Bitcoin sì, o lunedì.";
  } else if (!trendUp && !trendDown) {
    blockReason = "Niente trend. EMA intrecciate: resta piatto.";
  } else if (compressed) {
    blockReason = "Range compresso (ATR). Filtro anti-falso breakout attivo.";
  } else if (setup.id === "none") {
    blockReason =
      "Manca almeno una delle quattro: trend, momentum, volume, rischio. Setup debole.";
  }

  const passed = checks.filter((c) => c.pass).length;
  const quality = Math.round((passed / checks.length) * 100);

  const summary =
    allowedLong || allowedShort
      ? `${setup.label}. Stop sotto/sopra la candela, target almeno 2R.`
      : blockReason ?? "Aspetta. Un buon trade risponde sì a tutte e quattro.";

  const factors = checks.map((c) => ({
    id: c.id,
    label: c.question,
    tone: (c.pass ? (trendUp ? "long" : trendDown ? "short" : "neutral") : "block") as FactorTone,
    score: c.pass ? 1 : -1,
    value: c.value,
    note: c.note,
  }));

  return {
    price,
    atr: atrNow,
    ema20: eFast,
    ema50: eSlow,
    ema200: eSlow,
    rsi: rsiNow,
    vwap: vwapNow,
    volumeRatio,
    extensionPct,
    session,
    structure: { lastHigh: lastCandle.high, lastLow: lastCandle.low },
    signal: { high: lastCandle.high, low: lastCandle.low },
    checks,
    setup,
    factors,
    bias: trendUp ? "long" : trendDown ? "short" : "neutral",
    quality,
    summary,
    allowed: { long: allowedLong, short: allowedShort },
    blockReason,
  };
}
