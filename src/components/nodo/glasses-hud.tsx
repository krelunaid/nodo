import { PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Face } from "@/components/nodo/face";
import { useNodo } from "@/lib/nodo/store";

/** Cosa vede Chiara sulla lente — stesso squillo dell'app. */
export function GlassesHud({ compact = false }: { compact?: boolean }) {
  const incoming = useNodo((s) => s.incoming);
  const active = useNodo((s) => s.active);
  const acceptIncoming = useNodo((s) => s.acceptIncoming);
  const declineIncoming = useNodo((s) => s.declineIncoming);
  const passCall = useNodo((s) => s.passCall);
  const colleagues = useNodo((s) => s.colleagues);
  const glassesOn = useNodo((s) => s.devices.glasses);
  const onDuty = useNodo((s) => s.onDuty);
  const free = colleagues.filter((c) => c.presence === "available").slice(0, 3);

  if (!glassesOn) {
    return (
      <p className="rounded-3xl border border-border bg-surface p-4 text-sm text-muted">
        Occhio spento. Accendilo sopra: la lente mostra chi chiama.
      </p>
    );
  }

  const peer = incoming?.peer ?? active?.peer;
  const number = incoming?.number ?? active?.number;

  return (
    <div className="flex flex-col items-center rounded-3xl border border-border bg-surface p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">
        {onDuty ? "Tu sei il centralino" : "Sulla lente"}
      </p>
      <div
        className={
          compact
            ? "mt-3 flex size-36 flex-col items-center justify-center rounded-full border border-accent bg-bg"
            : "mt-3 flex size-48 flex-col items-center justify-center rounded-full border border-accent bg-bg"
        }
      >
        {peer ? (
          <>
            <p className="px-4 text-center text-sm font-medium">{peer}</p>
            <p className="mt-1 font-mono text-[11px] text-muted">{number}</p>
            <p className="mt-2 text-[10px] tracking-wide text-accent uppercase">
              {incoming ? "In arrivo" : "In linea"}
            </p>
          </>
        ) : (
          <p className="px-6 text-center text-xs text-muted">
            {onDuty ? "In attesa. Quando suona, lo vedi qui." : "Nessuna chiamata. La lente resta pulita."}
          </p>
        )}
      </div>
      {incoming && (
        <div className="mt-3 flex w-full gap-2">
          <Button className="flex-1 rounded-full" onClick={acceptIncoming}>
            Rispondi
          </Button>
          <Button className="flex-1 rounded-full" variant="secondary" onClick={declineIncoming}>
            <PhoneOff className="size-4" />
          </Button>
        </div>
      )}
      {incoming && free.length > 0 && (
        <div className="mt-3 flex gap-3">
          {free.map((c) => (
            <button key={c.id} type="button" onClick={() => passCall(c.id)} className="flex flex-col items-center gap-1">
              <Face name={c.name} photo={c.photo} size="sm" />
              <span className="text-[10px]">{c.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
