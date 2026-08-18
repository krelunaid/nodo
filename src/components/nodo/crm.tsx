import { useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatWhen } from "@/lib/nodo/format";
import { useNodo } from "@/lib/nodo/store";
import { cn } from "@/lib/utils";

export function CrmPanel() {
  const accounts = useNodo((s) => s.crm);
  const crmId = useNodo((s) => s.crmId);
  const setCrm = useNodo((s) => s.setCrm);
  const log = useNodo((s) => s.crmLog);
  const add = useNodo((s) => s.addCrmNote);
  const startCall = useNodo((s) => s.startCall);
  const [note, setNote] = useState("");
  const current = accounts.find((a) => a.id === crmId) ?? accounts[0];
  const history = log.filter((l) => l.accountId === current?.id);

  return (
    <div className="grid min-h-[420px] overflow-hidden rounded-lg border border-border bg-surface md:grid-cols-[240px_1fr]">
      <aside className="border-b border-border md:border-r md:border-b-0">
        {accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setCrm(a.id)}
            className={cn(
              "flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-3 text-left",
              a.id === current?.id ? "bg-elevated" : "hover:bg-bg",
            )}
          >
            <span className="text-sm font-medium">{a.company}</span>
            <span className="text-xs text-muted">
              {a.stage} · {a.value}
            </span>
          </button>
        ))}
      </aside>
      {current && (
        <div className="flex min-h-0 flex-col p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">{current.company}</h2>
              <p className="text-sm text-muted">
                {current.name} · {current.phone}
              </p>
            </div>
            <Button onClick={() => startCall(current.company, current.phone)}>
              <Phone /> Chiama dal CRM
            </Button>
          </div>
          <p className="mt-4 text-xs font-medium tracking-wide text-muted uppercase">Attività</p>
          <ul className="mt-2 flex-1 space-y-2 overflow-y-auto">
            {history.map((h) => (
              <li key={h.id} className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
                <p>{h.text}</p>
                <p className="font-mono text-[11px] text-subtle">
                  {h.kind === "call" ? "Chiamata" : "Nota"} · {formatWhen(h.at)}
                </p>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              add(note);
              setNote("");
            }}
          >
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota sulla pratica" />
            <Button type="submit">Salva</Button>
          </form>
        </div>
      )}
    </div>
  );
}

export function CrmChip({ number }: { number: string }) {
  const match = useNodo((s) => s.matchCrm(number));
  const setView = useNodo((s) => s.setView);
  const setCrm = useNodo((s) => s.setCrm);
  if (!match) return null;
  return (
    <button
      type="button"
      className="mt-2 block text-left text-xs text-muted underline-offset-2 hover:underline"
      onClick={() => {
        setCrm(match.id);
        setView("crm");
      }}
    >
      CRM · {match.company} · {match.stage}
    </button>
  );
}
