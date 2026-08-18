export type FxSession = {
  id: "asia" | "london" | "overlap" | "newyork" | "weekend" | "off";
  label: string;
  quality: "alta" | "media" | "bassa";
  note: string;
  open: boolean;
};

function londonParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: get("weekday").toLowerCase(),
    hour: Number.parseInt(get("hour"), 10) || 0,
    minute: Number.parseInt(get("minute"), 10) || 0,
  };
}

export function currentFxSession(): FxSession {
  const { weekday, hour } = londonParts();
  const weekend =
    weekday.startsWith("sat") ||
    weekday.startsWith("sun") ||
    weekday.startsWith("sab") ||
    weekday.startsWith("dom");

  if (weekend) {
    return {
      id: "weekend",
      label: "Weekend · mercato chiuso",
      quality: "bassa",
      note: "FX, oro e indici non quotano. Solo crypto è 24/7. Un desk non inventa prezzo il sabato.",
      open: false,
    };
  }
  if (hour >= 13 && hour < 17) {
    return {
      id: "overlap",
      label: "Overlap Londra / New York",
      quality: "alta",
      note: "Massima liquidità. Spread più stretti. Ideale per FX e indici.",
      open: true,
    };
  }
  if (hour >= 8 && hour < 13) {
    return {
      id: "london",
      label: "Sessione Londra",
      quality: "alta",
      note: "Motore principale dell'EUR e del GBP.",
      open: true,
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      id: "newyork",
      label: "Sessione New York",
      quality: "media",
      note: "Buona su indici USA e oro. FX spesso già direzionale.",
      open: true,
    };
  }
  if (hour >= 0 && hour < 8) {
    return {
      id: "asia",
      label: "Sessione Asia",
      quality: "bassa",
      note: "Range più stretti. Evita di forzare breakout su EUR/USD.",
      open: true,
    };
  }
  return {
    id: "off",
    label: "Fuori sessione",
    quality: "bassa",
    note: "Liquidità scarsa. Lo stop può slittare.",
    open: false,
  };
}

export function londonNowLabel(): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}
