import { useEffect, useRef, useState } from "react";
import { Face } from "@/components/nodo/face";
import { useNodo } from "@/lib/nodo/store";
import { cn } from "@/lib/utils";

type Pos = { x: number; y: number };

function around(i: number, n: number, r: number): Pos {
  const a = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r };
}

export function Constellation() {
  const colleagues = useNodo((s) => s.colleagues);
  const active = useNodo((s) => s.active);
  const incoming = useNodo((s) => s.incoming);
  const startCall = useNodo((s) => s.startCall);
  const passCall = useNodo((s) => s.passCall);
  const addToTray = useNodo((s) => s.addToTray);
  const openGroupFromTray = useNodo((s) => s.openGroupFromTray);
  const field = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Record<string, Pos>>({});
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    setPos((prev) => {
      const next = { ...prev };
      colleagues.forEach((c, i) => {
        if (!next[c.id]) next[c.id] = around(i, colleagues.length, i % 2 === 0 ? 34 : 22);
      });
      return next;
    });
  }, [colleagues]);

  function pct(e: React.PointerEvent) {
    const box = field.current?.getBoundingClientRect();
    if (!box) return { x: 50, y: 50 };
    return {
      x: ((e.clientX - box.left) / box.width) * 100,
      y: ((e.clientY - box.top) / box.height) * 100,
    };
  }

  function hit(id: string, p: Pos) {
    return colleagues.find((c) => {
      if (c.id === id) return false;
      const o = pos[c.id];
      if (!o) return false;
      const dx = o.x - p.x;
      const dy = o.y - p.y;
      return dx * dx + dy * dy < 36;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] tracking-wide text-muted uppercase">Trascina le persone</p>
      <p className="text-xs text-muted">
        Sopra un collega: gruppo. Se c’è una chiamata, gli passa la linea. Tocco: chiama l’interno.
      </p>
      <div
        ref={field}
        className="relative min-h-[420px] overflow-hidden rounded-[2.5rem] border border-border bg-surface"
        onPointerMove={(e) => {
          if (!drag.current) return;
          const p = pct(e);
          const { id, dx, dy } = drag.current;
          moved.current = true;
          setPos((s) => ({
            ...s,
            [id]: {
              x: Math.min(92, Math.max(8, p.x - dx)),
              y: Math.min(90, Math.max(10, p.y - dy)),
            },
          }));
        }}
        onPointerUp={(e) => {
          if (!drag.current) return;
          const id = drag.current.id;
          const p = pos[id];
          drag.current = null;
          if (!p) return;
          const other = hit(id, p);
          if (!other) return;
          if (active || incoming) {
            passCall(other.id);
            return;
          }
          addToTray(id);
          addToTray(other.id);
          openGroupFromTray();
        }}
        onPointerLeave={() => {
          drag.current = null;
        }}
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border" />

        <div className="absolute top-1/2 left-1/2 flex size-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-accent text-accent-fg shadow-panel">
          <span className="text-sm font-medium">Nodo</span>
          <span className="text-[10px] opacity-80">{active ? "in linea" : incoming ? "arrivo" : "banco"}</span>
        </div>

        {colleagues.map((c) => {
          const p = pos[c.id] ?? { x: 50, y: 50 };
          return (
            <button
              key={c.id}
              type="button"
              className={cn(
                "absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center active:cursor-grabbing",
              )}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const now = pct(e);
                moved.current = false;
                drag.current = { id: c.id, dx: now.x - p.x, dy: now.y - p.y };
              }}
              onClick={() => {
                if (moved.current) return;
                if (active || incoming) passCall(c.id);
                else startCall(c.name, c.ext);
              }}
            >
              <Face
                name={c.name}
                photo={c.photo}
                ring={cn(
                  "border-2",
                  c.presence === "available" && "border-ok",
                  c.presence === "busy" && "border-danger",
                  c.presence === "away" && "border-warn",
                  c.presence === "offline" && "border-subtle",
                )}
              />
              <span className="mt-1 max-w-16 truncate text-[11px]">{c.name.split(" ")[0]}</span>
              <span className="font-mono text-[10px] text-muted">{c.ext}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
