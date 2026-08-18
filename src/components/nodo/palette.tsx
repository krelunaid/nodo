import { useEffect, useMemo, useState } from "react";
import { useNodo } from "@/lib/nodo/store";

const VIEWS = [
  { id: "oggi", label: "Oggi" },
  { id: "telefono", label: "Centralino" },
  { id: "crm", label: "CRM" },
  { id: "chat", label: "Chat" },
  { id: "posta", label: "Posta gruppo" },
  { id: "note", label: "Note" },
  { id: "agenda", label: "Agenda" },
  { id: "rubrica", label: "Rubrica" },
  { id: "archivio", label: "Archivio" },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const setView = useNodo((s) => s.setView);
  const startCall = useNodo((s) => s.startCall);
  const colleagues = useNodo((s) => s.colleagues);
  const crm = useNodo((s) => s.crm);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQ("");
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    const items: Array<{ key: string; label: string; run: () => void }> = [];
    for (const v of VIEWS) {
      if (!n || v.label.toLowerCase().includes(n)) {
        items.push({ key: `v-${v.id}`, label: `Apri ${v.label}`, run: () => setView(v.id) });
      }
    }
    for (const c of colleagues) {
      if (!n || c.name.toLowerCase().includes(n) || c.ext.includes(n)) {
        items.push({
          key: `p-${c.id}`,
          label: `Chiama ${c.name} (${c.ext})`,
          run: () => startCall(c.name, c.ext),
        });
      }
    }
    for (const a of crm) {
      if (!n || a.company.toLowerCase().includes(n) || a.phone.includes(n)) {
        items.push({
          key: `c-${a.id}`,
          label: `Chiama ${a.company}`,
          run: () => startCall(a.company, a.phone),
        });
      }
    }
    return items.slice(0, 10);
  }, [q, colleagues, crm, setView, startCall]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 grid place-items-start bg-chrome/40 p-4 pt-[12vh]">
      <div className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca persona, pratica, schermata…"
          className="h-12 w-full border-b border-border bg-transparent px-4 text-sm outline-none"
        />
        <ul>
          {rows.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                className="flex w-full px-4 py-2.5 text-left text-sm hover:bg-elevated"
                onClick={() => {
                  r.run();
                  setOpen(false);
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
