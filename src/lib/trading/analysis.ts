import type { Candle } from "./candles";
import { lastValid } from "./candles";
import { atr, ema, last, rsi, sma, vwap } from "./indicators";
import type { Instrument } from "./instruments";
import { costGate } from "./cost";
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
  | "fade-long"
  | "fade-short"
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

function recentSwing(candles: Candle[], lookback = 12): {
  lastHigh: number | null;
  lastLow: number | null;
} {
  const slice = candles.slice(Math.max(0, candles.length - lookback - 1), -1);
  if (slice.length < 3) return { lastHigh: null, lastLow: null };
  return {
    lastHigh: Math.max(...slice.map((c) => c.high)),
    lastLow: Math.min(...slice.map((c) => c.low)),
  };
}

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
  const rsiNotHot = rsiNow != null && rsiNow <= 68;
  const rsiNotCold = rsiNow != null && rsiNow >= 32;
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
  const bullClose = lastCandle.close > lastCandle.open;
  const bearClose = lastCandle.close < lastCandle.open;
  const rangeOk = lastCandle.high - lastCandle.low >= atrNow * 0.7;
  const participation = instrument.session === "fx" ? rangeOk : volOk;
  const thinSession =
    instrument.session !== "crypto" && (session.quality !== "alta" || session.chop);
  const energyBan = instrument.session === "energy" && style !== "swing";
  const scalpSessionBad =
    style === "scalp" && session.quality !== "alta" && instrument.session !== "crypto";

  const marketClosed = instrument.session !== "crypto" && !session.open;
  const cost = costGate(style, instrument, atrNow);


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
      pass: participation && !thinSession && !scalpSessionBad && !energyBan,
      value:
        instrument.session === "fx"
          ? rangeOk
            ? "Range candela ok"
            : "Candela piccola"
          : volumeRatio != null
            ? `${volumeRatio.toFixed(2)}× (soglia ${volMult.toFixed(1)}×)`
            : "n/d",
      note: energyBan
        ? "Petrolio e gas sullo storico hanno mangiato il conto. Solo swing, o niente."
        : thinSession
          ? "Fascia che nello storico sbaglia: apertura Londra 8–11 o Asia."
          : scalpSessionBad
            ? "Scalp solo quando la sessione è pulita."
            : participation
              ? "C'è partecipazione. Non è un tick vuoto."
              : "Candela debole. I breakout senza corpo mentono.",
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
          ? "Volatilità morta: lo spread mangia il trade."
          : stretched
            ? "Prezzo troppo lontano dalla media. Non inseguire."
            : "C'è spazio per lo stop sulla candela.",
    },
  ];

  if (marketClosed) {
    checks[0] = { ...checks[0], pass: false, note: session.note };
    checks[3] = { ...checks[3], pass: false };
  }
  if (!trendUp && !trendDown) checks[0] = { ...checks[0], pass: false };

  const fadeWindow = session.hour >= 13 && session.hour < 21;
  const canFade =
    (instrument.session === "index" && fadeWindow) || instrument.session === "crypto";
  const fadeLong =
    canFade &&
    rsiNow != null &&
    rsiNow <= 32 &&
    bullClose &&
    !compressed &&
    (instrument.session === "crypto" || !marketClosed);
  const fadeShort =
    canFade &&
    rsiNow != null &&
    rsiNow >= 68 &&
    bearClose &&
    !compressed &&
    (instrument.session === "crypto" || !marketClosed);
  if (fadeLong || fadeShort) {
    checks[0] = {
      ...checks[0],
      pass: true,
      note:
        instrument.session === "crypto"
          ? "Crypto 24/7: fade dell'eccesso."
          : "Indice in eccesso. Non insegui: prendi il ritorno.",
    };
    checks[1] = {
      ...checks[1],
      pass: true,
      note: fadeLong ? "RSI scarico: fade long." : "RSI carico: fade short.",
    };
  }

  let setup: { id: SetupId; label: string } = { id: "none", label: "Nessun setup" };

  const cleanLong = trendUp && rsiLong && rsiNotHot && bullClose && participation && !stretched;
  const cleanShort = trendDown && rsiShort && rsiNotCold && bearClose && participation && !stretched;
  const htfLongOk = style === "scalp" || htfUp;
  const htfShortOk = style === "scalp" || htfDown;

  if (fadeLong) {
    setup = {
      id: "fade-long",
      label: instrument.session === "crypto" ? "Fade long crypto · RSI scarico" : "Fade long · RSI scarico sull'indice",
    };
  } else if (fadeShort) {
    setup = {
      id: "fade-short",
      label: instrument.session === "crypto" ? "Fade short crypto · RSI carico" : "Fade short · RSI carico sull'indice",
    };
  } else if (!marketClosed && !compressed && !thinSession && !scalpSessionBad && !energyBan && cost.ok) {
    if (style === "scalp" && cleanLong && aboveVwap && (rsiNear50 || rsiLong) && htfLongOk) {
      setup = { id: "scalp-long", label: "Scalp long · EMA + VWAP + candela verde" };
    } else if (style === "scalp" && cleanShort && belowVwap && (rsiNear50 || rsiShort) && htfShortOk) {
      setup = { id: "scalp-short", label: "Scalp short · EMA + VWAP + candela rossa" };
    } else if (cleanLong && aboveSlow && nearFast && htfLongOk) {
      setup = { id: "pullback-long", label: "Pullback long · rientro EMA, non inseguire" };
    } else if (cleanShort && belowSlow && nearFast && htfShortOk) {
      setup = { id: "pullback-short", label: "Pullback short · rientro EMA, non inseguire" };
    } else if (style === "swing" && cleanLong && aboveSlow && htfUp) {
      setup = { id: "swing-long", label: "Swing long · trend + HTF + candela verde" };
    } else if (style === "swing" && cleanShort && belowSlow && htfDown) {
      setup = { id: "swing-short", label: "Swing short · trend + HTF + candela rossa" };
    }
  }

  const fourYes = checks.every((c) => c.pass);
  const allowedLong = setup.id.endsWith("long") && fourYes && !marketClosed;
  const allowedShort = setup.id.endsWith("short") && fourYes && !marketClosed;

  let blockReason: string | null = null;
  if (marketClosed) {
    blockReason =
      "Weekend o mercato chiuso. FX, oro e indici non si toccano. Bitcoin sì, o lunedì.";
  } else if (!trendUp && !trendDown && !fadeLong && !fadeShort) {
    blockReason = "Niente trend. EMA intrecciate: resta piatto.";
  } else if (compressed) {
    blockReason = "Range compresso (ATR). Filtro anti-falso breakout attivo.";
  } else if (energyBan) {
    blockReason = "Energia: nello storico è dove si sbagliava di più. Non in intra/scalp.";
  } else if (thinSession) {
    blockReason = session.chop
      ? "Apertura Londra 8–11: troppi falsi. Aspetta le 11 o New York."
      : "Sessione debole. Aspetta una fascia pulita.";
  } else if (scalpSessionBad) {
    blockReason = "Scalp solo in fascia pulita, non in Asia.";
  } else if (!cost.ok) {
    blockReason = cost.reason;
  } else if (setup.id === "none") {
    blockReason =
      "Niente setup pulito: day trading selettivo, niente scalp su spread largo.";
  }

  const passed = checks.filter((c) => c.pass).length;
  const quality = Math.round((passed / checks.length) * 100);

  const summary =
    allowedLong || allowedShort
      ? `${setup.label}. Stop sulla candela. Sull'indice, solo fade degli eccessi.`
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
    structure: recentSwing(candles),
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
