import { useState } from "react";
import { Briefcase, Calendar, Phone, StickyNote } from "lucide-react";
import { Face } from "@/components/nodo/face";
import { Lino } from "@/components/nodo/lino";
import { DeviceStrip } from "@/components/nodo/devices";
import { GlassesHud } from "@/components/nodo/glasses-hud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatWhen } from "@/lib/nodo/format";
import { useNodo } from "@/lib/nodo/store";
import type { ViewId } from "@/lib/nodo/types";
import { isElectron } from "@/lib/nodo/runtime";

const SATS: Array<{ id: ViewId; label: string; icon: typeof Phone }> = [
  { id: "telefono", label: "Centralino", icon: Phone },
  { id: "crm", label: "Lavoro", icon: Briefcase },
  { id: "agenda", label: "Studio", icon: Calendar },
  { id: "note", label: "Perle", icon: StickyNote },
];

export function OggiPanel() {
  const agendaAll = useNodo((s) => s.agenda);
  const voiceAll = useNodo((s) => s.voicemail);
  const crm = useNodo((s) => s.crm);
  const logAll = useNodo((s) => s.crmLog);
  const colleagues = useNodo((s) => s.colleagues);
  const agenda = agendaAll.filter((e) => e.day === 0);
  const voice = voiceAll.filter((v) => !v.heard);
  const log = logAll.slice(0, 3);
  const parked = useNodo((s) => s.parked);
  const unpark = useNodo((s) => s.unpark);
  const setView = useNodo((s) => s.setView);
  const startCall = useNodo((s) => s.startCall);
  const claraRun = useNodo((s) => s.claraRun);
  const onDuty = useNodo((s) => s.onDuty);
  const setOnDuty = useNodo((s) => s.setOnDuty);
  const setDevice = useNodo((s) => s.setDevice);
  const [cmd, setCmd] = useState("");
  const [reply, setReply] = useState("Chiama Landi · passa Elena · apri CRM");
  const free = colleagues.filter((c) => c.presence === "available");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface px-4 py-8">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-[280px] rounded-full border border-border sm:size-[340px]" />
          <div className="absolute size-[180px] rounded-full border border-border sm:size-[220px]" />
        </div>

        <div className="relative mx-auto flex max-w-lg flex-col items-center">
          <div className="mb-8 grid w-full max-w-sm grid-cols-2 justify-items-center gap-y-6 sm:grid-cols-4">
            {SATS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setView(s.id)}
                  className="flex flex-col items-center gap-2"
                >
                  <span className="flex size-14 items-center justify-center rounded-full border border-border bg-bg shadow-panel">
                    <Icon className="size-5 text-accent" />
                  </span>
                  <span className="text-xs">{s.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setView("telefono")}
            className="flex size-36 flex-col items-center justify-center rounded-full bg-accent text-accent-fg shadow-panel sm:size-40"
          >
            <span className="text-lg font-medium tracking-wide">Nodo</span>
            <span className="mt-1 px-4 text-center text-[11px] opacity-80">Il tuo centro</span>
          </button>

          <Button
            className="mt-6 min-h-12 w-full max-w-sm rounded-full"
            variant={onDuty ? "default" : "secondary"}
            onClick={() => {
              setDevice("glasses", true);
              setOnDuty(!onDuty);
            }}
          >
            {onDuty ? "Sei tu il centralino · tocca per lasciare" : "Entro in studio · faccio da Centralino"}
          </Button>

          {!isElectron() && (
          <div className="mt-4 flex w-full max-w-sm flex-col gap-2">
            <p className="text-center text-xs text-muted">Il programma da installare (non è la preview)</p>
            <a href="/Nodo-MacBook.zip" download className="flex min-h-12 items-center justify-center rounded-full bg-accent text-sm text-accent-fg">
              Scarica per MacBook
            </a>
            <a href="/Nodo-Windows.zip" download className="flex min-h-11 items-center justify-center rounded-full border border-border text-sm">
              Scarica per Windows
            </a>
          </div>
          )}

          <form
            className="mt-8 flex w-full max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setReply(claraRun(cmd));
              setCmd("");
            }}
          >
            <Input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="Chiedi a Clara…" className="rounded-full" />
            <Button type="submit" className="rounded-full">
              Vai
            </Button>
          </form>
          <p className="mt-2 text-center text-xs text-muted">{reply}</p>
          {parked && (
            <Button className="mt-3 rounded-full" size="sm" onClick={unpark}>
              Riprendi {parked.peer}
            </Button>
          )}
        </div>
      </section>

      <aside className="flex flex-col gap-3">
        <section className="rounded-3xl border border-border bg-surface p-4">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Interni liberi</p>
          <p className="mt-1 text-xs text-muted">Possono rispondere adesso.</p>
          <ul className="mt-3 space-y-2">
            {free.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <Face name={c.name} photo={c.photo} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm">{c.name.split(" ")[0]}</span>
                <button type="button" className="text-xs text-accent" onClick={() => startCall(c.name, c.ext)}>
                  {c.ext}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <DeviceStrip />
        <GlassesHud compact />
        <Lino />
        <section className="rounded-3xl border border-border bg-surface p-4">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Oggi</p>
          <ul className="mt-3 space-y-2">
            {agenda.map((e) => (
              <li key={e.id} className="text-sm">
                <span className="font-mono text-xs">{e.when}</span> · {e.title}
              </li>
            ))}
          </ul>
          {voice.length > 0 && <p className="mt-3 text-xs text-muted">{voice.length} in segreteria</p>}
          {log[0] && (
            <p className="mt-2 text-xs text-muted">
              {crm.find((c) => c.id === log[0].accountId)?.company} · {formatWhen(log[0].at)}
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
