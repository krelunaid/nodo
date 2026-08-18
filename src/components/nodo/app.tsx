import { useEffect } from "react";
import {
  BookUser,
  Briefcase,
  Calendar,
  LayoutGrid,
  Mail,
  MessageSquare,
  Minus,
  NotebookPen,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Search,
  Send,
  Settings2,
  Square,
  Sun,
  StickyNote,
  Voicemail,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Face } from "@/components/nodo/face";
import { Lino } from "@/components/nodo/lino";
import { MenuBar } from "@/components/nodo/menubar";
import { CrmChip, CrmPanel } from "@/components/nodo/crm";
import { OggiPanel } from "@/components/nodo/oggi";
import { Tasca } from "@/components/nodo/tasca";
import { CommandPalette } from "@/components/nodo/palette";
import { MailPanel } from "@/components/nodo/mail";
import { ModuliPanel } from "@/components/nodo/moduli";
import { OrbDesk } from "@/components/nodo/orb-desk";
import { ArchivePanel, RubricaPanel, ShipPanel, WeekAgenda } from "@/components/nodo/desk-more";
import { ChatPanel, LogPanel, NotesPanel, SettingsPanel, VoicePanel } from "@/components/nodo/panels";
import { ME } from "@/lib/nodo/seed";
import { useNodo } from "@/lib/nodo/store";
import type { ViewId } from "@/lib/nodo/types";
import { cn } from "@/lib/utils";
import { isElectron } from "@/lib/nodo/runtime";

const NAV: Array<{ id: ViewId; label: string; icon: typeof Phone }> = [
  { id: "oggi", label: "Oggi", icon: Sun },
  { id: "telefono", label: "Centralino", icon: Phone },
  { id: "posta", label: "Posta gruppo", icon: Mail },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "note", label: "Perle", icon: StickyNote },
  { id: "agenda", label: "Agenda", icon: Calendar },
  { id: "rubrica", label: "Rubrica", icon: BookUser },
  { id: "archivio", label: "Archivio", icon: Search },
  { id: "spedizioni", label: "Spedizioni", icon: Send },
  { id: "registro", label: "Registro", icon: NotebookPen },
  { id: "segreteria", label: "Segreteria", icon: Voicemail },
  { id: "moduli", label: "Moduli", icon: LayoutGrid },
  { id: "crm", label: "CRM", icon: Briefcase },
  { id: "impostazioni", label: "Deviazioni", icon: Settings2 },
];

export function NodoApp() {
  const view = useNodo((s) => s.view);
  const setView = useNodo((s) => s.setView);
  const incoming = useNodo((s) => s.incoming);
  const offerIncoming = useNodo((s) => s.offerIncoming);
  const acceptIncoming = useNodo((s) => s.acceptIncoming);
  const declineIncoming = useNodo((s) => s.declineIncoming);
  const voicemail = useNodo((s) => s.voicemail);
  const unreadVoice = voicemail.reduce((n, v) => n + (v.heard ? 0 : 1), 0);
  const passCall = useNodo((s) => s.passCall);
  const colleagues = useNodo((s) => s.colleagues);
  const crmList = useNodo((s) => s.crm);
  const free = colleagues.filter((c) => c.presence === "available");
  const digits = incoming?.number.replace(/\D/g, "") ?? "";
  const crmHit = crmList.find((a) => a.phone.replace(/\D/g, "") === digits);

  const shell = useNodo((s) => s.shell);
  const setShell = useNodo((s) => s.setShell);
  const current = NAV.find((n) => n.id === view);
  const packed = isElectron();
  const desk = packed || shell === "desk";

  useEffect(() => {
    const t = window.setTimeout(() => {
      offerIncoming("Ufficio tecnico Comune", "02 8846 1200");
    }, 14000);
    return () => window.clearTimeout(t);
  }, [offerIncoming]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3">
        <div className="flex items-center gap-2">
          <span className="size-6 rounded-full bg-accent shadow-panel" />
          <p className="text-sm font-medium tracking-wide">Nodo</p>
        </div>
        {!packed && (
          <div className="flex items-center gap-1 rounded-full border border-border p-0.5">
            <button type="button" onClick={() => setShell("desk")} className={cn("min-h-8 rounded-full px-3 text-xs", desk ? "bg-accent text-accent-fg" : "text-muted")}>
              Computer
            </button>
            <button type="button" onClick={() => setShell("phone")} className={cn("min-h-8 rounded-full px-3 text-xs", !desk ? "bg-accent text-accent-fg" : "text-muted")}>
              App
            </button>
          </div>
        )}
        {!packed && (
          <div className="flex items-center gap-2">
            <a href="/Nodo-MacBook.zip" download className="inline-flex min-h-8 items-center rounded-full bg-accent px-3 text-xs text-accent-fg">
              Scarica Mac
            </a>
            <a href="/Nodo-Windows.zip" download className="hidden min-h-8 items-center rounded-full border border-border px-3 text-xs sm:inline-flex">
              Windows
            </a>
          </div>
        )}
        {packed && (
          <p className="font-mono text-[12px] text-muted">{ME.name} · int. {ME.ext}</p>
        )}
      </header>

      {desk ? <MenuBar /> : null}
      <CommandPalette />

      <div className="flex min-h-0 flex-1">
        <nav className={cn("w-16 shrink-0 flex-col border-r border-border bg-surface py-3 md:w-52", desk ? "flex" : "hidden")}>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => setView(item.id)}
                className={cn(
                  "mx-2 mb-1 flex min-h-11 items-center justify-center gap-2 rounded-full px-2 text-sm md:justify-start",
                  view === item.id ? "bg-elevated text-fg" : "text-muted hover:bg-bg hover:text-fg",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
                {item.id === "segreteria" && unreadVoice > 0 && (
                  <span className="ml-auto hidden font-mono text-[11px] md:inline">{unreadVoice}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className={cn("h-11 shrink-0 items-center justify-between border-b border-border bg-bg px-4", desk ? "flex" : "hidden")}>
            <h1 className="text-sm font-medium">{current?.label}</h1>
            <p className="hidden text-xs text-muted sm:block">
              {ME.seat} · linea di prova
            </p>
          </div>

          <main className={cn("min-h-0 flex-1 overflow-auto bg-bg p-3 md:p-4", desk ? "pb-4" : "pb-24")}>
            {view === "oggi" && (desk ? <OggiPanel /> : <Tasca />)}
            {view === "telefono" && <OrbDesk />}
            {view === "posta" && <MailPanel />}
            {view === "chat" && <ChatPanel />}
            {view === "note" && <NotesPanel />}
            {view === "agenda" && <WeekAgenda />}
            {view === "registro" && <LogPanel />}
            {view === "segreteria" && <VoicePanel />}
            {view === "rubrica" && <RubricaPanel />}
            {view === "archivio" && <ArchivePanel />}
            {view === "spedizioni" && <ShipPanel />}
            {view === "moduli" && <ModuliPanel />}
            {view === "crm" && <CrmPanel />}
            {view === "impostazioni" && <SettingsPanel />}
          </main>
        </div>
      </div>

      {view !== "oggi" && desk && (
        <div className="absolute right-3 bottom-24 z-10 max-w-xs md:bottom-12">
          <Lino compact />
        </div>
      )}

      <footer className="hidden h-8 shrink-0 items-center justify-between border-t border-border bg-surface px-3 font-mono text-[11px] text-subtle md:flex">
        <span>Collegato allo studio · Ctrl+K cerca</span>
        <span>Nodo by Kreluna</span>
      </footer>


      <nav className={cn("fixed inset-x-0 bottom-0 z-20 justify-around border-t border-border bg-surface px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1", desk ? "hidden" : "flex")}>
        {([
          { id: "oggi", label: "Oggi", icon: Sun },
          { id: "telefono", label: "Chiama", icon: Phone },
          { id: "chat", label: "Chat", icon: MessageSquare },
          { id: "crm", label: "Lavoro", icon: Briefcase },
          { id: "impostazioni", label: "Altro", icon: Settings2 },
        ] as const).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={cn(
                "flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 text-[10px]",
                view === item.id ? "text-accent" : "text-muted",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {incoming && (
        <div className="absolute inset-0 z-30 grid place-items-end bg-bg p-4 pb-8 md:place-items-center">
          <aside className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-border bg-surface p-6 shadow-panel">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">In arrivo</p>
            <span className="mt-4 flex size-28 items-center justify-center rounded-full bg-accent text-2xl font-medium text-accent-fg shadow-panel">
              {incoming.peer.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
            <p className="mt-3 text-lg font-medium">{incoming.peer}</p>
            <p className="font-mono text-sm text-muted">{incoming.number}</p>
            <CrmChip number={incoming.number} />
            {crmHit && (
              <p className="mt-1 text-sm">
                {crmHit.stage} · {crmHit.value}
              </p>
            )}
            {free.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {free.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => passCall(c.id)}
                    className="flex flex-col items-center gap-1"
                  >
                    <Face name={c.name} photo={c.photo} size="sm" />
                    <span className="text-[11px]">Passa a {c.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={acceptIncoming}>
                Rispondi
              </Button>
              <Button className="flex-1" variant="secondary" onClick={declineIncoming}>
                <PhoneOff /> Rifiuta
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
