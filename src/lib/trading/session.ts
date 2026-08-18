export type FxSession = {
  id: "asia" | "london" | "overlap" | "newyork" | "weekend" | "off";
  label: string;
  quality: "alta" | "media" | "bassa";
  note: string;
  open: boolean;
  hour: number;
  chop: boolean;
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
      note: "FX, oro e indici non quotano. Solo crypto è 24/7.",
      open: false,
      hour,
      chop: false,
    };
  }
  if (hour >= 13 && hour < 17) {
    return {
      id: "overlap",
      label: "Overlap Londra / New York",
      quality: "alta",
      note: "Massima liquidità. Qui lo storico ha sbagliato di meno.",
      open: true,
      hour,
      chop: false,
    };
  }
  if (hour >= 8 && hour < 11) {
    return {
      id: "london",
      label: "Apertura Londra · rumore",
      quality: "bassa",
      note: "Dalle 8 alle 11 Londra lo storico ha perso spesso (falsi breakout). Niente trade.",
      open: true,
      hour,
      chop: true,
    };
  }
  if (hour >= 11 && hour < 13) {
    return {
      id: "london",
      label: "Londra tarda",
      quality: "alta",
      note: "Dopo le 11 il rumore dell'apertura è sceso.",
      open: true,
      hour,
      chop: false,
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      id: "newyork",
      label: "Sessione New York",
      quality: "alta",
      note: "Nello storico è la fascia meno dannosa. Non va tagliata.",
      open: true,
      hour,
      chop: false,
    };
  }
  if (hour >= 0 && hour < 8) {
    return {
      id: "asia",
      label: "Sessione Asia",
      quality: "bassa",
      note: "Range stretti. Fuori.",
      open: true,
      hour,
      chop: true,
    };
  }
  return {
    id: "off",
    label: "Fuori sessione",
    quality: "bassa",
    note: "Liquidità scarsa.",
    open: false,
    hour,
    chop: true,
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
