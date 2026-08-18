import { useEffect, useMemo, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { Face, readPhoto } from "@/components/nodo/face";
import { Constellation } from "@/components/nodo/constellation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDuration, initials } from "@/lib/nodo/format";
import { useNodo } from "@/lib/nodo/store";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function Orb({
  label,
  sub,
  tone = "ink",
  size = "md",
  pulse,
  dragId,
  onDropId,
  onClick,
}: {
  label: string;
  sub?: string;
  tone?: "ink" | "live" | "wait" | "paper";
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  dragId?: string;
  onDropId?: (id: string) => void;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      draggable={!!dragId}
      onDragStart={(e) => {
        if (dragId) e.dataTransfer.setData("text/nodo-id", dragId);
      }}
      onDragOver={(e) => {
        if (onDropId) e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/nodo-id");
        if (id && onDropId) onDropId(id);
      }}
      onClick={onClick}
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-full border text-center shadow-panel",
        size === "sm" && "size-16 text-[10px]",
        size === "md" && "size-20 text-[11px]",
        size === "lg" && "size-28 text-xs",
        tone === "ink" && "border-accent bg-accent text-accent-fg",
        tone === "live" && "border-accent bg-accent text-accent-fg",
        tone === "wait" && "border-warn bg-warn-fg text-fg",
        tone === "paper" && "border-border bg-surface text-fg",
        pulse && "animate-pulse",
        dragId && "cursor-grab",
      )}
    >
      <span className="px-2 font-medium leading-tight">{label}</span>
      {sub && <span className="mt-0.5 font-mono opacity-70">{sub}</span>}
    </button>
  );
}

export function OrbDesk() {
  const [digits, setDigits] = useState("");
  const [pad, setPad] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [group, setGroup] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pass, setPass] = useState("");
  const colleagues = useNodo((s) => s.colleagues);
  const active = useNodo((s) => s.active);
  const incoming = useNodo((s) => s.incoming);
  const parked = useNodo((s) => s.parked);
  const notes = useNodo((s) => s.notes);
  const startCall = useNodo((s) => s.startCall);
  const endCall = useNodo((s) => s.endCall);
  const parkCall = useNodo((s) => s.parkCall);
  const unpark = useNodo((s) => s.unpark);
  const passCall = useNodo((s) => s.passCall);
  const passToMobile = useNodo((s) => s.passToMobile);
  const acceptIncoming = useNodo((s) => s.acceptIncoming);
  const addToTray = useNodo((s) => s.addToTray);
  const setColleaguePhoto = useNodo((s) => s.setColleaguePhoto);
  const openGroupFromTray = useNodo((s) => s.openGroupFromTray);
  const addColleague = useNodo((s) => s.addColleague);
  const [neo, setNeo] = useState({ name: "", ext: "", mobile: "", seat: "Milano" });

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const seats = useMemo(() => [...new Set(colleagues.map((c) => c.seat))], [colleagues]);
  const shown = colleagues.filter((c) => {
    if (group && c.seat !== group) return false;
    if (!q.trim()) return true;
    const n = q.trim().toLowerCase();
    return c.name.toLowerCase().includes(n) || c.ext.includes(n) || c.role.toLowerCase().includes(n);
  });
  const elapsed = active ? Math.floor((now - active.startedAt) / 1000) : 0;
  const passHits = pass.trim()
    ? colleagues.filter(
        (c) => c.name.toLowerCase().includes(pass.toLowerCase()) || c.ext.includes(pass),
      ).slice(0, 6)
    : [];


  function handlePerson(id: string, payload: string) {
    if (payload === "call" || payload === "incoming") {
      passCall(id);
      return;
    }
    if (payload && payload !== id) {
      addToTray(payload);
      addToTray(id);
      openGroupFromTray();
    }
  }

  return (
    <div className="relative min-h-[560px] overflow-hidden rounded-lg bg-elevated">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-1/3 left-1/3 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border" />
        <div className="absolute top-1/2 right-1/4 size-[280px] rounded-full border border-border" />
      </div>

      <div className="relative grid gap-4 p-4 lg:grid-cols-[auto_1fr_220px]">
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => setPad((v) => !v)}
            className="flex size-24 flex-col items-center justify-center rounded-full bg-accent text-accent-fg shadow-panel"
          >
            <span className="text-xs tracking-wide uppercase">Tasti</span>
            <span className="font-mono text-sm">{digits || "·"}</span>
          </button>
          {pad && (
            <div className="grid w-40 grid-cols-3 gap-1.5 rounded-full bg-surface p-4">
              {KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="size-10 rounded-full bg-bg text-sm hover:bg-elevated"
                  onClick={() => setDigits((d) => (d + k).slice(0, 16))}
                >
                  {k}
                </button>
              ))}
              <Button
                size="sm"
                className="col-span-3 rounded-full"
                onClick={() => {
                  if (!digits) return;
                  startCall("Numero", digits);
                  setDigits("");
                }}
              >
                Chiama
              </Button>
            </div>
          )}

          {(active || incoming) && (
            <div className="flex w-full max-w-xs flex-col items-center gap-2 rounded-3xl border border-border bg-surface p-3">
              <p className="text-[11px] font-medium tracking-wide text-muted uppercase">Passa a · tocca la foto</p>
              <Input
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Filtra nome o interno"
                className="h-9 rounded-full"
              />
              <div className="flex max-h-52 flex-wrap justify-center gap-2 overflow-y-auto">
                {(passHits.length ? passHits : colleagues).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      passCall(c.id);
                      setPass("");
                    }}
                    className="flex w-14 flex-col items-center gap-0.5"
                  >
                    <Face name={c.name} photo={c.photo} size="sm" />
                    <span className="w-full truncate text-center text-[10px]">{c.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {active && (
            <div className="flex flex-col items-center gap-2">
              <Orb
                label={active.peer.split(" ")[0]}
                sub={formatDuration(elapsed)}
                tone="live"
                size="lg"
                pulse
                dragId="call"
              />
              <p className="text-[11px] text-muted">Oppure trascina la cornetta.</p>
              <form
                className="flex gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const hit = colleagues.find(
                    (c) => c.name.toLowerCase().includes(pass.toLowerCase()) || c.ext === pass,
                  );
                  if (hit) {
                    passCall(hit.id);
                    setPass("");
                  }
                }}
              >
                <Input
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="Passa a nome o interno"
                  className="h-9 w-44 rounded-full"
                />
              </form>
              {passHits.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {passHits.map((c) => (
                    <button key={c.id} type="button" onClick={() => { passCall(c.id); setPass(""); }} className="flex flex-col items-center">
                      <Face name={c.name} photo={c.photo} size="sm" />
                      <span className="text-[10px]">{c.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" className="rounded-full" onClick={parkCall}>
                  Attesa
                </Button>
                <Button size="sm" variant="danger" className="rounded-full" onClick={() => endCall()}>
                  <PhoneOff />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[11px] tracking-wide text-muted uppercase">Interni in linea</p>
            {active ? (
              <Orb label={initials(active.peer)} sub={active.number} tone="live" dragId="call" />
            ) : (
              <span className="text-sm text-subtle">Nessuna</span>
            )}
          </div>

          <div
            className="flex min-h-32 flex-wrap items-center gap-3 rounded-full border border-dashed border-border-strong px-6 py-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.getData("text/nodo-id") === "incoming") acceptIncoming();
            }}
          >
            <p className="w-full text-[11px] tracking-wide text-muted uppercase">Entrata · rilascia qui per rispondere</p>
            {incoming && (
              <Orb
                label={incoming.peer.split(" ")[0]}
                sub={incoming.number.slice(-4)}
                tone="live"
                size="lg"
                pulse
                dragId="incoming"
                onClick={acceptIncoming}
              />
            )}
          </div>

          <div
            className="flex min-h-28 flex-wrap items-center gap-3 rounded-full border border-dashed border-border px-6 py-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.getData("text/nodo-id") === "call") parkCall();
            }}
          >
            <p className="w-full text-[11px] tracking-wide text-muted uppercase">Attesa · rilascia la chiamata</p>
            {parked && (
              <Orb label={parked.peer.split(" ")[0]} sub="in attesa" tone="wait" dragId="parked" onClick={unpark} />
            )}
          </div>

          <Constellation />
          <form
              className="mt-4 grid max-w-xl gap-2 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                addColleague(neo.name, neo.ext, neo.mobile, neo.seat);
                setNeo({ name: "", ext: "", mobile: "", seat: neo.seat });
              }}
            >
              <p className="sm:col-span-2 text-[11px] tracking-wide text-muted uppercase">Nuova persona dello studio</p>
              <Input value={neo.name} onChange={(e) => setNeo({ ...neo, name: e.target.value })} placeholder="Nome e cognome" />
              <Input value={neo.ext} onChange={(e) => setNeo({ ...neo, ext: e.target.value })} placeholder="Interno (es. 209)" />
              <Input value={neo.mobile} onChange={(e) => setNeo({ ...neo, mobile: e.target.value })} placeholder="Cellulare" />
              <Input value={neo.seat} onChange={(e) => setNeo({ ...neo, seat: e.target.value })} placeholder="Sede" />
              <Button type="submit" className="sm:col-span-2">Inserisci interno</Button>
            </form>
        </div>

        <aside className="flex flex-col items-center gap-3">
          <p className="text-[11px] tracking-wide text-muted uppercase">Gruppi</p>
          {seats.map((seat) => (
            <Orb
              key={seat}
              label={seat}
              sub={`${colleagues.filter((c) => c.seat === seat).length}`}
              tone={group === seat ? "live" : "paper"}
              onClick={() => setGroup((g) => (g === seat ? null : seat))}
            />
          ))}
          <p className="mt-4 text-center text-[11px] leading-relaxed text-subtle">
            Trascina due orb insieme: si apre la posta del gruppo.
          </p>
        </aside>
      </div>

      <div className="pointer-events-none absolute inset-0">
        {notes.slice(0, 3).map((n, i) => (
          <article
            key={n.id}
            className={cn(
              "pointer-events-auto absolute flex size-28 items-center justify-center rounded-full p-3 text-center text-[11px] leading-snug shadow-panel",
              n.hue === "sand" && "bg-warn-fg",
              n.hue === "sage" && "bg-ok-fg",
              n.hue === "rose" && "bg-danger-fg",
              n.hue === "sky" && "bg-cell-fg",
            )}
            style={{ top: 24 + i * 18, right: 28 + i * 36 }}
          >
            {n.body}
          </article>
        ))}
      </div>
    </div>
  );
}
