import { useMemo, useState } from "react";
import { extractNumbers } from "@/lib/nodo/format";
import { useNodo } from "@/lib/nodo/store";
import { cn } from "@/lib/utils";

function LinoBody({ compact }: { compact?: boolean }) {
  return (
    <span className={cn("relative block overflow-hidden rounded-full bg-bg", compact ? "size-16" : "size-24")}>
      <video
        src="/lino.mp4"
        poster="/lino-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        className="size-full object-cover"
      />
    </span>
  );
}

export function Lino({ compact = false }: { compact?: boolean }) {
  const incoming = useNodo((s) => s.incoming);
  const parked = useNodo((s) => s.parked);
  const notes = useNodo((s) => s.notes);
  const voice = useNodo((s) => s.voicemail);
  const setView = useNodo((s) => s.setView);
  const startCall = useNodo((s) => s.startCall);
  const acceptIncoming = useNodo((s) => s.acceptIncoming);
  const unpark = useNodo((s) => s.unpark);
  const [i, setI] = useState(0);

  const alerts = useMemo(() => {
    const rows: Array<{ text: string; run: () => void }> = [];
    if (incoming) {
      rows.push({ text: `Sta squillando ${incoming.peer}. Tocca e rispondi.`, run: acceptIncoming });
    }
    if (parked) {
      rows.push({ text: `${parked.peer} è in attesa. Tocca e riprendi.`, run: unpark });
    }
    for (const n of notes) {
      const nums = extractNumbers(n.body);
      if (nums[0]) {
        rows.push({
          text: `Perla: ${n.body} — tocca e chiamo.`,
          run: () => startCall(nums[0], nums[0].replace(/\s/g, "")),
        });
      } else {
        rows.push({ text: `Perla: ${n.body}`, run: () => setView("note") });
      }
    }
    const unread = voice.filter((v) => !v.heard).length;
    if (unread) {
      rows.push({ text: `${unread} in segreteria. Tocca e apri.`, run: () => setView("segreteria") });
    }
    if (!rows.length) {
      rows.push({ text: "Tutto quieto. Se aggiungi una perla, ti avviso io.", run: () => setView("note") });
    }
    return rows;
  }, [incoming, parked, notes, voice, acceptIncoming, unpark, startCall, setView]);

  const current = alerts[i % alerts.length];

  return (
    <button
      type="button"
      onClick={() => {
        current.run();
        setI((n) => n + 1);
      }}
      className={
        compact
          ? "flex items-center gap-2 rounded-3xl border border-border bg-bg p-1 pr-3 text-left"
          : "flex w-full items-center gap-3 rounded-3xl border border-border bg-bg p-2 pr-3 text-left"
      }
    >
      <LinoBody compact={compact} />
      <span className="min-w-0">
        <span className="block text-xs font-medium">Lino</span>
        <span className="block text-xs leading-snug text-muted">{current.text}</span>
      </span>
    </button>
  );
}
