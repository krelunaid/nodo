export type SessionKind = "fx" | "index" | "metal" | "crypto";

export type Instrument = {
  id: string;
  label: string;
  yahoo: string;
  digits: number;
  pip: number;
  spread: number;
  session: SessionKind;
  group: string;
  description: string;
};

export const INSTRUMENTS: Instrument[] = [
  {
    id: "EURUSD",
    label: "EUR/USD",
    yahoo: "EURUSD=X",
    digits: 5,
    pip: 0.0001,
    spread: 0.00008,
    session: "fx",
    group: "fx-eu",
    description: "Coppia maggiore. Liquida su Londra e New York.",
  },
  {
    id: "GBPUSD",
    label: "GBP/USD",
    yahoo: "GBPUSD=X",
    digits: 5,
    pip: 0.0001,
    spread: 0.00012,
    session: "fx",
    group: "fx-eu",
    description: "Correlata a EUR/USD. Non raddoppiare lo stesso rischio.",
  },
  {
    id: "XAUUSD",
    label: "Oro",
    yahoo: "GC=F",
    digits: 2,
    pip: 0.1,
    spread: 0.25,
    session: "metal",
    group: "metal",
    description: "Volatile. Lo stop va dimensionato sull'ATR, non a sentimento.",
  },
  {
    id: "US500",
    label: "S&P 500",
    yahoo: "^GSPC",
    digits: 2,
    pip: 0.25,
    spread: 0.4,
    session: "index",
    group: "us-index",
    description: "Sessione cash USA. Evita i primi minuti dell'apertura.",
  },
  {
    id: "US100",
    label: "Nasdaq 100",
    yahoo: "^NDX",
    digits: 2,
    pip: 0.5,
    spread: 0.8,
    session: "index",
    group: "us-index",
    description: "Correlato all'S&P. Una sola posizione indice alla volta.",
  },
  {
    id: "BTCUSD",
    label: "Bitcoin",
    yahoo: "BTC-USD",
    digits: 1,
    pip: 1,
    spread: 12,
    session: "crypto",
    group: "crypto",
    description: "24/7. Gap e spike notturni. Time stop obbligatorio.",
  },
];

export const TIMEFRAMES = [
  { id: "5m", label: "5 min", yahoo: "5m", range: "5d", minutes: 5, higher: "1h" },
  { id: "15m", label: "15 min", yahoo: "15m", range: "1mo", minutes: 15, higher: "1h" },
  { id: "1h", label: "1 ora", yahoo: "60m", range: "3mo", minutes: 60, higher: "1d" },
  { id: "4h", label: "4 ore", yahoo: "60m", range: "6mo", minutes: 240, higher: "1d" },
] as const;

export type TimeframeId = (typeof TIMEFRAMES)[number]["id"];

export function getInstrument(id: string): Instrument {
  return INSTRUMENTS.find((item) => item.id === id) ?? INSTRUMENTS[0];
}

export function formatPrice(value: number, digits: number): string {
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatMoney(value: number, currency = "EUR"): string {
  return value.toLocaleString("it-IT", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}
