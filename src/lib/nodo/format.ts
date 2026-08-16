export function formatTime(ms: number) {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
}

export function formatWhen(ms: number) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function extractNumbers(text: string): string[] {
  return text.match(/\d[\d\s.]{5,}\d/g) ?? [];
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function avatarTone(_id: string) {
  return "bg-accent text-accent-fg";
}
