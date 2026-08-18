import { useMemo, useState } from "react";
import { Phone, Search } from "lucide-react";
import { Face, readPhoto } from "@/components/nodo/face";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatWhen } from "@/lib/nodo/format";
import { useNodo } from "@/lib/nodo/store";
import type { Shipment } from "@/lib/nodo/types";
import { cn } from "@/lib/utils";

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven"];

export function RubricaPanel() {
  const contacts = useNodo((s) => s.contacts);
  const addContact = useNodo((s) => s.addContact);
  const startCall = useNodo((s) => s.startCall);
  const setContactPhoto = useNodo((s) => s.setContactPhoto);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">Rubrica</p>
      <form
        className="mt-3 grid gap-2 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          addContact(name, company, phone);
          setName("");
          setCompany("");
          setPhone("");
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
        <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Azienda" />
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numero" />
        <Button type="submit">Salva</Button>
      </form>
      <ul className="mt-4 divide-y divide-border">
        {contacts.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <label className="flex cursor-pointer items-center gap-3">
              <Face name={c.name} photo={c.photo} size="sm" />
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readPhoto(file, (data) => setContactPhoto(c.id, data));
                }}
              />
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted">
                  {c.company} · {c.phone} · {c.visibility === "private" ? "privata" : "pubblica"}
                </p>
              </div>
            </label>
            <Button size="sm" variant="secondary" onClick={() => startCall(c.name, c.phone)}>
              <Phone />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ArchivePanel() {
  const [q, setQ] = useState("");
  const chats = useNodo((s) => s.chats);
  const calls = useNodo((s) => s.calls);
  const shipments = useNodo((s) => s.shipments);
  const notes = useNodo((s) => s.notes);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all: Array<{ id: string; kind: string; text: string; at: number }> = [];
    for (const c of chats) {
      for (const m of c.messages) {
        all.push({
          id: m.id,
          kind: "Messaggio",
          text: `${c.title}: ${m.text}${m.file ? ` [${m.file}]` : ""}`,
          at: m.at,
        });
      }
    }
    for (const c of calls) all.push({ id: c.id, kind: "Chiamata", text: `${c.peer} ${c.number}`, at: c.at });
    for (const s of shipments)
      all.push({ id: s.id, kind: "Spedizione", text: `${s.kind} a ${s.to} · ${s.status}`, at: s.at });
    for (const n of notes) all.push({ id: n.id, kind: "Nota", text: n.body, at: n.at });
    return all
      .filter((r) => !needle || r.text.toLowerCase().includes(needle) || r.kind.toLowerCase().includes(needle))
      .sort((a, b) => b.at - a.at);
  }, [q, chats, calls, shipments, notes]);

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">Archivio</p>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute top-3 left-3 size-4 text-subtle" />
        <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca in chat, chiamate, note, spedizioni" />
      </div>
      <ul className="mt-4 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="py-3">
            <p className="text-[11px] tracking-wide text-subtle uppercase">{r.kind}</p>
            <p className="text-sm">{r.text}</p>
            <p className="font-mono text-[11px] text-subtle">{formatWhen(r.at)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ShipPanel() {
  const items = useNodo((s) => s.shipments);
  const add = useNodo((s) => s.addShipment);
  const [kind, setKind] = useState<Shipment["kind"]>("raccomandata");
  const [to, setTo] = useState("");
  const [file, setFile] = useState("");

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">Spedizioni dalla postazione</p>
      <p className="mt-1 text-sm text-muted">Simulazione in studio: nessun invio reale alle Poste.</p>
      <form
        className="mt-3 grid gap-2 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          add(kind, to, file || undefined);
          setTo("");
          setFile("");
        }}
      >
        <select
          className="h-11 rounded-sm border border-border bg-bg px-3 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value as Shipment["kind"])}
        >
          <option value="raccomandata">Raccomandata</option>
          <option value="telegramma">Telegramma</option>
          <option value="prioritaria">Prioritaria</option>
        </select>
        <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Destinatario" />
        <Input value={file} onChange={(e) => setFile(e.target.value)} placeholder="Documento (es. pratica.pdf)" />
        <Button type="submit">Accetta e archivia</Button>
      </form>
      <ul className="mt-4 divide-y divide-border">
        {items.map((s) => (
          <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <div>
              <p className="text-sm font-medium">
                {s.kind} · {s.to}
              </p>
              <p className="text-xs text-muted">
                {s.status}
                {s.file ? ` · ${s.file}` : ""}
              </p>
            </div>
            <p className="font-mono text-xs">{s.price}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WeekAgenda() {
  const agenda = useNodo((s) => s.agenda);
  const addEvent = useNodo((s) => s.addEvent);
  const moveEvent = useNodo((s) => s.moveEvent);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [withWho, setWithWho] = useState("");

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">Agenda · trascina sul giorno</p>
      <form
        className="mt-3 grid gap-2 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          addEvent(title, when, withWho, 0);
          setTitle("");
          setWhen("");
          setWithWho("");
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Impegno" />
        <Input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="Ora" />
        <Input value={withWho} onChange={(e) => setWithWho(e.target.value)} placeholder="Con chi" />
        <Button type="submit">Metti in lunedì</Button>
      </form>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
        {DAYS.map((d, i) => (
          <div
            key={d}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/nodo-event");
              if (id) moveEvent(id, i);
            }}
            className="min-h-36 rounded-md border border-border bg-bg p-2"
          >
            <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{d}</p>
            <ul className="mt-2 space-y-1.5">
              {agenda
                .filter((e) => e.day === i)
                .map((e) => (
                  <li
                    key={e.id}
                    draggable
                    onDragStart={(ev) => ev.dataTransfer.setData("text/nodo-event", e.id)}
                    className="cursor-grab rounded-sm border border-border bg-surface px-2 py-1.5"
                  >
                    <p className="text-xs font-medium">{e.title}</p>
                    <p className="font-mono text-[10px] text-subtle">
                      {e.when} · {e.with}
                    </p>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
