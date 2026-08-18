import { useState } from "react";
import { useNodo } from "@/lib/nodo/store";
import { cn } from "@/lib/utils";

const MENUS = [
  {
    id: "file",
    label: "File",
    items: [
      { label: "Nuova nota", view: "note" as const },
      { label: "Nuovo contatto", view: "rubrica" as const },
      { label: "Esporta rubrica", action: "export" as const },
      { label: "Scarica il programma", action: "download" as const },
    ],
  },
  {
    id: "centralino",
    label: "Centralino",
    items: [
      { label: "Oggi", view: "oggi" as const },
      { label: "Postazione", view: "telefono" as const },
      { label: "Registro", view: "registro" as const },
      { label: "Segreteria", view: "segreteria" as const },
      { label: "Deviazioni", view: "impostazioni" as const },
    ],
  },
  {
    id: "strumenti",
    label: "Strumenti",
    items: [
      { label: "Conferenza e ascolto", view: "moduli" as const },
      { label: "Timbratore", view: "moduli" as const },
      { label: "Fax", view: "moduli" as const },
      { label: "Spedizioni", view: "spedizioni" as const },
      { label: "Hotel", view: "moduli" as const },
      { label: "Clara", view: "moduli" as const },
      { label: "CRM clienti", view: "crm" as const },
    ],
  },
  {
    id: "aiuto",
    label: "Aiuto",
    items: [{ label: "Informazioni su Nodo 1.0", action: "about" as const }],
  },
];

export function MenuBar() {
  const [open, setOpen] = useState<string | null>(null);
  const [about, setAbout] = useState(false);
  const setView = useNodo((s) => s.setView);
  const exportContacts = useNodo((s) => s.exportContacts);

  return (
    <div className="relative flex h-8 shrink-0 items-center gap-0.5 border-b border-border bg-surface px-1">
      {MENUS.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            type="button"
            className={cn(
              "h-7 rounded-sm px-2 text-[12px]",
              open === menu.id ? "bg-accent text-accent-fg" : "text-fg hover:bg-elevated",
            )}
            onClick={() => setOpen((v) => (v === menu.id ? null : menu.id))}
          >
            {menu.label}
          </button>
          {open === menu.id && (
            <ul className="absolute top-full left-0 z-30 min-w-48 border border-border bg-surface py-1 shadow-panel">
              {menu.items.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    className="flex w-full px-3 py-1.5 text-left text-[12px] hover:bg-elevated"
                    onClick={() => {
                      if ("view" in item && item.view) setView(item.view);
                      if ("action" in item && item.action === "export") {
                        void navigator.clipboard?.writeText(exportContacts());
                      }
                      if ("action" in item && item.action === "download") {
                        window.location.href = "/Nodo-by-Kreluna-programma.zip";
                      }
                      if ("action" in item && item.action === "about") setAbout(true);
                      setOpen(null);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {about && (
        <div className="absolute top-9 left-4 z-40 w-72 rounded-md border border-border bg-surface p-4 shadow-panel">
          <p className="font-display text-lg">Nodo 1.0</p>
          <p className="mt-1 text-sm text-muted">by Kreluna. Programma dello studio. Linee di prova.</p>
          <button type="button" className="mt-3 text-xs underline" onClick={() => setAbout(false)}>
            Chiudi
          </button>
        </div>
      )}
    </div>
  );
}
