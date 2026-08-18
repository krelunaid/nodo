import { useEffect, useState } from "react";
import { Mic, MicOff, Pause, Phone, PhoneOff, Users } from "lucide-react";
import { Avatar } from "@/components/nodo/avatar";
import { Button } from "@/components/ui/button";
import { COLLEAGUES } from "@/lib/nodo/seed";
import { formatDuration } from "@/lib/nodo/format";
import { useNodo } from "@/lib/nodo/store";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export function PhonePanel() {
  const [digits, setDigits] = useState("");
  const [now, setNow] = useState(Date.now());
  const colleagues = useNodo((s) => s.colleagues);
  const active = useNodo((s) => s.active);
  const incoming = useNodo((s) => s.incoming);
  const tray = useNodo((s) => s.tray);
  const startCall = useNodo((s) => s.startCall);
  const endCall = useNodo((s) => s.endCall);
  const toggleMute = useNodo((s) => s.toggleMute);
  const toggleHold = useNodo((s) => s.toggleHold);
  const passCall = useNodo((s) => s.passCall);
  const addToTray = useNodo((s) => s.addToTray);
  const clearTray = useNodo((s) => s.clearTray);
  const openGroupFromTray = useNodo((s) => s.openGroupFromTray);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  function dial() {
    const n = digits.trim();
    if (!n) return;
    const known = COLLEAGUES.find((c) => c.ext === n || c.mobile.replace(/\s/g, "") === n.replace(/\s/g, ""));
    startCall(known?.name ?? "Numero esterno", n);
    setDigits("");
  }

  function onPersonDrop(targetId: string, sourceId: string) {
    if (!sourceId) return;
    if (sourceId === "call") {
      passCall(targetId);
      return;
    }
    if (sourceId !== targetId) {
      addToTray(sourceId);
      addToTray(targetId);
    }
  }

  const elapsed = active ? Math.floor((now - active.startedAt) / 1000) : 0;
  const trayPeople = tray.map((id) => colleagues.find((c) => c.id === id)).filter(Boolean);

  return (
    <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
      <section className="rounded-lg border border-border bg-surface p-3">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Tastiera</p>
        <p className="mt-2 min-h-9 font-mono text-xl tracking-wide tabular-nums">{digits || "—"}</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className="h-11 rounded-md border border-border bg-bg text-base hover:border-border-strong"
              onClick={() => setDigits((d) => (d + k).slice(0, 16))}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Button className="flex-1" size="sm" onClick={dial} disabled={!digits || !!active}>
            <Phone /> Chiama
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDigits((d) => d.slice(0, -1))}>
            Canc
          </Button>
        </div>
      </section>

      <div className="grid gap-3">
        {(active || incoming) && (
          <article
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/nodo-id", "call")}
            className="cursor-grab rounded-lg border border-accent bg-surface p-4"
          >
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              {incoming && !active ? "In arrivo · trascina su un collega" : "In linea · trascina su un collega"}
            </p>
            <h2 className="mt-1 font-display text-2xl">{active?.peer ?? incoming?.peer}</h2>
            <p className="font-mono text-sm text-muted tabular-nums">
              {active?.number ?? incoming?.number}
              {active ? ` · ${formatDuration(elapsed)}` : ""}
              {active?.transferredTo ? ` · passo a ${active.transferredTo}` : ""}
            </p>
            {active && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={toggleMute}>
                  {active.muted ? <MicOff /> : <Mic />} {active.muted ? "Riattiva" : "Muto"}
                </Button>
                <Button size="sm" variant="secondary" onClick={toggleHold}>
                  <Pause /> {active.onHold ? "Riprendi" : "Attesa"}
                </Button>
                <Button size="sm" variant="danger" onClick={() => endCall()}>
                  <PhoneOff /> Chiudi
                </Button>
                <Button size="sm" variant="secondary" onClick={() => useNodo.getState().parkCall()}>
                  Parcheggia
                </Button>
                <Button size="sm" variant="secondary" onClick={() => useNodo.getState().setView("note")}>
                  Nota
                </Button>
              </div>
            )}
          </article>
        )}

        <section
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/nodo-id");
            if (id && id !== "call") addToTray(id);
          }}
          className="rounded-lg border border-dashed border-border-strong bg-surface p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              <Users className="mr-1 inline size-3.5" />
              Trascina qui le persone per un gruppo
            </p>
            <div className="flex gap-2">
              {tray.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearTray}>
                  Svuota
                </Button>
              )}
              <Button size="sm" disabled={tray.length < 2} onClick={() => openGroupFromTray()}>
                Apri posta del gruppo
              </Button>
            </div>
          </div>
          <div className="mt-3 flex min-h-14 flex-wrap gap-2">
            {trayPeople.length === 0 && (
              <p className="text-sm text-subtle">Due o più icone: la mail la vedono tutti.</p>
            )}
            {trayPeople.map((p) =>
              p ? (
                <span key={p.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-bg pr-3">
                  <Avatar id={p.id} name={p.name} size="sm" />
                  <span className="text-sm">{p.name.split(" ")[0]}</span>
                </span>
              ) : null,
            )}
          </div>
        </section>

        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {colleagues.map((c) => (
            <li key={c.id}>
              <article
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/nodo-id", c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onPersonDrop(c.id, e.dataTransfer.getData("text/nodo-id"));
                }}
                className="flex cursor-grab flex-col items-center gap-2 rounded-lg border border-border bg-surface px-3 py-4 text-center hover:border-border-strong"
              >
                <span className="relative">
                  <Avatar id={c.id} name={c.name} size="lg" />
                  <span
                    className={cn(
                      "absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-surface",
                      c.presence === "available" && "bg-ok",
                      c.presence === "busy" && "bg-danger",
                      c.presence === "away" && "bg-warn",
                      c.presence === "offline" && "bg-subtle",
                    )}
                  />
                </span>
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="font-mono text-[11px] text-muted">{c.ext}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    title="Interno"
                    disabled={!!active}
                    onClick={() => startCall(c.name, c.ext)}
                    className="flex size-10 items-center justify-center rounded-full bg-ok text-ok-fg disabled:opacity-40"
                  >
                    <Phone className="size-4" />
                  </button>
                  <button
                    type="button"
                    title="Cellulare"
                    disabled={!!active}
                    onClick={() => startCall(`${c.name} · cell`, c.mobile)}
                    className="flex size-10 items-center justify-center rounded-full bg-cell text-cell-fg disabled:opacity-40"
                  >
                    <Phone className="size-4" />
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
