export function hoursFromMinutes(minutes: number): number {
  return minutes / 60;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function styleHorizon(style: "scalp" | "intraday" | "swing"): {
  minHours: number;
  maxHours: number;
  label: string;
} {
  if (style === "scalp") return { minHours: 5 / 60, maxHours: 40 / 60, label: "5–40 minuti" };
  if (style === "swing") return { minHours: 4, maxHours: 48, label: "4 ore – 2 giorni" };
  return { minHours: 0.5, maxHours: 4, label: "30 minuti – 4 ore" };
}
