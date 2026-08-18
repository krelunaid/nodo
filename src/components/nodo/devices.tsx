import { Glasses, Laptop, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNodo } from "@/lib/nodo/store";
import type { DeviceId } from "@/lib/nodo/types";

const ITEMS: Array<{ id: DeviceId; label: string; hint: string; icon: typeof Laptop }> = [
  { id: "computer", label: "Computer", hint: "scrivania", icon: Laptop },
  { id: "phone", label: "Telefono", hint: "questa app", icon: Smartphone },
  { id: "glasses", label: "Occhio", hint: "lente", icon: Glasses },
];

export function DeviceStrip() {
  const devices = useNodo((s) => s.devices);
  const setDevice = useNodo((s) => s.setDevice);
  const onDuty = useNodo((s) => s.onDuty);
  const setOnDuty = useNodo((s) => s.setOnDuty);

  return (
    <section className="rounded-3xl border border-border bg-surface p-3">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">I tuoi dispositivi</p>
      <p className="mt-1 text-xs text-muted">Stesso interno. Squillano insieme.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const on = devices[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setDevice(item.id, !on)}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-center",
                on ? "border-accent bg-bg text-fg" : "border-border text-muted",
              )}
            >
              <Icon className="size-4" />
              <span className="text-[11px] font-medium">{item.label}</span>
              <span className="text-[10px]">{on ? "collegato" : "spento"}</span>
            </button>
          );
        })}
      </div>
      <Button
        className="mt-3 w-full rounded-full"
        variant={onDuty ? "default" : "secondary"}
        onClick={() => {
          if (!devices.glasses) setDevice("glasses", true);
          setOnDuty(!onDuty);
        }}
      >
        {onDuty ? "Sei tu il centralino · tocca per lasciare" : "Entro in studio · faccio da Centralino"}
      </Button>
      <p className="mt-2 text-xs text-muted">
        L’occhio mostra chi chiama. La linea resta quella dello studio. Non è un secondo TIM.
      </p>
    </section>
  );
}
