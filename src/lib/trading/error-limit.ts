import type { ClosedTrade } from "./types";

export const MAX_DAY_LOSS_PCT = 2;
export const MAX_LOSSES_IN_A_ROW = 2;

export function londonDayStart(now = Date.now()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  const iso = `${get("year")}-${get("month")}-${get("day")}T00:00:00`;
  const utcGuess = Date.parse(iso + "Z");
  const londonHour = Number.parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "numeric",
      hour12: false,
    }).format(new Date(utcGuess)),
    10,
  );
  return utcGuess - londonHour * 3600_000;
}

export function maxTradesToday(equity: number): number {
  if (equity < 3000) return 3;
  if (equity < 8000) return 4;
  return 5;
}

export function dayLossCap(equity: number): number {
  return (equity * MAX_DAY_LOSS_PCT) / 100;
}

export function errorLimit(input: {
  equity: number;
  journal: ClosedTrade[];
  now?: number;
}): { ok: boolean; reasons: string[]; dayPnl: number; todayCount: number; streak: number; cap: number; maxTrades: number } {
  const now = input.now ?? Date.now();
  const start = londonDayStart(now);
  const today = input.journal.filter((t) => t.closedAt >= start);
  const dayPnl = today.reduce((s, t) => s + t.pnl, 0);
  const cap = dayLossCap(input.equity);
  const maxTrades = maxTradesToday(input.equity);
  let streak = 0;
  for (const t of input.journal) {
    if (t.closedAt < start) break;
    if (t.pnl < -0.01) streak += 1;
    else break;
  }
  const reasons: string[] = [];
  if (dayPnl <= -cap) {
    reasons.push(
      `Tetto giornaliero: oggi ${dayPnl.toFixed(0)} €. Stop fino a domani (max −${cap.toFixed(0)} €, il 2%).`,
    );
  }
  if (streak >= MAX_LOSSES_IN_A_ROW) {
    reasons.push("Due stop di fila. Oggi basta: l'errore non si insegue.");
  }
  if (today.length >= maxTrades) {
    reasons.push(`Massimo ${maxTrades} operazioni oggi. Domani si ricomincia.`);
  }
  return { ok: reasons.length === 0, reasons, dayPnl, todayCount: today.length, streak, cap, maxTrades };
}
