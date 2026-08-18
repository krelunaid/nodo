import { DeviceStrip } from "@/components/nodo/devices";
import { GlassesHud } from "@/components/nodo/glasses-hud";
import { Face } from "@/components/nodo/face";
import { Lino } from "@/components/nodo/lino";
import { useNodo } from "@/lib/nodo/store";

export function Tasca() {
  const colleagues = useNodo((s) => s.colleagues);
  const startCall = useNodo((s) => s.startCall);
  const free = colleagues.filter((c) => c.presence === "available");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 pb-4">
      <header className="pt-1">
        <p className="text-xs tracking-wide text-muted uppercase">Nodo · tasca</p>
        <h2 className="text-xl font-medium">Chiara · int. 200</h2>
        <p className="text-sm text-muted">App, computer e occhiali: stesso squillo.</p>
      </header>
      <DeviceStrip />
      <GlassesHud />
      <section className="rounded-3xl border border-border bg-surface p-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Interni liberi</p>
        <ul className="mt-3 space-y-2">
          {free.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <Face name={c.name} photo={c.photo} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm">{c.name.split(" ")[0]}</span>
              <button type="button" className="min-h-11 text-xs text-accent" onClick={() => startCall(c.name, c.ext)}>
                {c.ext}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <Lino />
    </div>
  );
}
