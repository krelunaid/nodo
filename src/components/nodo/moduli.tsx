import { useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarSync,
  Ear,
  FileSpreadsheet,
  Globe,
  Hotel,
  KeyRound,
  Phone,
  Printer,
  Receipt,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COLLEAGUES } from "@/lib/nodo/seed";
import { formatWhen } from "@/lib/nodo/format";
import { useNodo } from "@/lib/nodo/store";

type ModuloId =
  | "ascolto"
  | "conferenza"
  | "estero"
  | "video"
  | "import"
  | "calendario"
  | "timbratore"
  | "api"
  | "fax"
  | "wiki"
  | "hotel"
  | "fatture"
  | "clara";

const CARDS: Array<{ id: ModuloId; title: string; body: string; icon: typeof Phone }> = [
  { id: "ascolto", title: "Ascolto in linea", body: "Ascolti una conversazione in corso, senza entrare in chiamata.", icon: Ear },
  { id: "conferenza", title: "Conferenza", body: "Audioconferenza e registrazione della conversazione.", icon: Users },
  { id: "estero", title: "Estero", body: "Dal cellulare esci con il numero aziendale, anche fuori Italia.", icon: Globe },
  { id: "video", title: "Video chiamata", body: "Stanza video di prova, web e telefono.", icon: Video },
  { id: "import", title: "Importa / esporta", body: "Rubrica da CSV o Excel incollato. Privata o pubblica.", icon: FileSpreadsheet },
  { id: "calendario", title: "Calendario", body: "Agenda dello studio, pronta da collegare a un calendario esterno.", icon: CalendarSync },
  { id: "timbratore", title: "Timbratore", body: "Entrate e uscite da più sedi, un solo registro.", icon: Bell },
  { id: "api", title: "API", body: "Endpoint di prova per collegare Nodo ad altri programmi.", icon: KeyRound },
  { id: "fax", title: "Fax virtuale", body: "Invio, ricezione e archivio. Nessuna linea analogica.", icon: Printer },
  { id: "wiki", title: "Wiki aziendale", body: "Il sapere dello studio, condiviso.", icon: BookOpen },
  { id: "hotel", title: "Hotel", body: "Chiamate di piano e sveglia in camera.", icon: Hotel },
  { id: "fatture", title: "Area clienti", body: "Fatture di tutte le sedi, in un posto.", icon: Receipt },
  { id: "clara", title: "Clara", body: "Assistente dello studio. Non è Ambrosia: è nostra.", icon: Phone },
];

export function ModuliPanel() {
  const [open, setOpen] = useState<ModuloId | null>(null);
  return (
    <div className="grid gap-3">
      {open && (
        <Button variant="secondary" size="sm" className="w-fit" onClick={() => setOpen(null)}>
          Tutti i moduli
        </Button>
      )}
      {!open && (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setOpen(c.id)}
                  className="flex h-full w-full items-start gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:border-border-strong"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-chrome text-bg">
                    <Icon className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{c.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">{c.body}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open === "ascolto" && <Ascolto />}
      {open === "conferenza" && <Conferenza />}
      {open === "estero" && <Estero />}
      {open === "video" && <VideoRoom />}
      {open === "import" && <ImportBox />}
      {open === "calendario" && <p className="text-sm text-muted">L’agenda è già nel menu. I file .ics si esportano da lì nella versione installata.</p>}
      {open === "timbratore" && <Timbratore />}
      {open === "api" && <ApiBox />}
      {open === "fax" && <FaxBox />}
      {open === "wiki" && <WikiBox />}
      {open === "hotel" && <HotelBox />}
      {open === "fatture" && <Fatture />}
      {open === "clara" && <Clara />}
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Ascolto() {
  const c = useNodo((s) => s.conference);
  const toggle = useNodo((s) => s.toggleListen);
  const active = useNodo((s) => s.active);
  return (
    <Box title="Ascolto in linea">
      <p className="text-sm text-muted">
        {active ? `In ascolto possibile su ${active.peer}.` : "Quando c’è una linea aperta, puoi entrare in ascolto."}
      </p>
      <Button className="mt-3" onClick={toggle}>
        {c.listening ? "Esci dall’ascolto" : "Entra in ascolto"}
      </Button>
      {c.listening && <p className="mt-2 text-sm">Ascolto attivo. Il collega non sente che sei in linea.</p>}
    </Box>
  );
}

function Conferenza() {
  const c = useNodo((s) => s.conference);
  const toggle = useNodo((s) => s.toggleConference);
  const rec = useNodo((s) => s.toggleRecord);
  const add = useNodo((s) => s.addToConference);
  return (
    <Box title="Conferenza">
      <div className="flex flex-wrap gap-2">
        <Button onClick={toggle}>{c.open ? "Chiudi stanza" : "Apri stanza"}</Button>
        <Button variant="secondary" onClick={rec} disabled={!c.open}>
          {c.recording ? "Stop registrazione" : "Registra"}
        </Button>
      </div>
      {c.open && (
        <>
          <p className="mt-3 text-sm">In stanza: {c.people.join(", ") || "—"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {COLLEAGUES.map((p) => (
              <Button key={p.id} size="sm" variant="secondary" onClick={() => add(p.name)}>
                Aggiungi {p.name.split(" ")[0]}
              </Button>
            ))}
          </div>
        </>
      )}
    </Box>
  );
}

function Estero() {
  const on = useNodo((s) => s.companyCli);
  const toggle = useNodo((s) => s.toggleCli);
  return (
    <Box title="Numero aziendale all’estero">
      <p className="text-sm text-muted">
        Se attivo, dal cellulare il destinatario vede lo 02 dello studio, non il tuo numero.
      </p>
      <Button className="mt-3" onClick={toggle}>
        {on ? "Attivo · 02 3651 200" : "Spento"}
      </Button>
    </Box>
  );
}

function VideoRoom() {
  return (
    <Box title="Video chiamata">
      <div className="grid aspect-video place-items-center rounded-md border border-dashed border-border-strong bg-chrome text-bg">
        <p className="text-sm">Stanza video di prova · camera non collegata</p>
      </div>
    </Box>
  );
}

function ImportBox() {
  const [raw, setRaw] = useState("Mario Bianchi;Acme;02 1234 5678");
  const imp = useNodo((s) => s.importContacts);
  const exp = useNodo((s) => s.exportContacts);
  const [note, setNote] = useState("");
  return (
    <Box title="Importa / esporta rubrica">
      <textarea
        className="min-h-24 w-full rounded-md border border-border bg-bg p-2 text-sm"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            const n = imp(raw);
            setNote(`${n} contatti importati`);
          }}
        >
          Importa CSV
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const csv = exp();
            void navigator.clipboard?.writeText(csv);
            setNote("Copiato negli appunti");
          }}
        >
          Esporta
        </Button>
      </div>
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
    </Box>
  );
}

function Timbratore() {
  const punches = useNodo((s) => s.punches);
  const punch = useNodo((s) => s.punch);
  const [seat, setSeat] = useState("Milano");
  return (
    <Box title="Timbratore">
      <div className="flex flex-wrap gap-2">
        <select
          className="h-11 rounded-sm border border-border bg-bg px-3 text-sm"
          value={seat}
          onChange={(e) => setSeat(e.target.value)}
        >
          <option>Milano</option>
          <option>Bergamo</option>
          <option>Brescia</option>
        </select>
        <Button onClick={() => punch("in", seat)}>Entrata</Button>
        <Button variant="secondary" onClick={() => punch("out", seat)}>
          Uscita
        </Button>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {punches.map((p) => (
          <li key={p.id} className="flex justify-between py-2 text-sm">
            <span>
              {p.who} · {p.seat} · {p.kind === "in" ? "entrata" : "uscita"}
            </span>
            <span className="font-mono text-xs text-subtle">{formatWhen(p.at)}</span>
          </li>
        ))}
      </ul>
    </Box>
  );
}

function ApiBox() {
  return (
    <Box title="API Nodo">
      <pre className="overflow-x-auto rounded-md bg-chrome p-3 font-mono text-[11px] text-bg">
        {`POST /v1/calls          apri / chiudi
POST /v1/calls/:id/transfer
GET  /v1/contacts
POST /v1/messages
GET  /v1/archive?q=`}
      </pre>
      <p className="mt-2 text-xs text-muted">Documentazione di prova. Non è l’API di YouNeed.</p>
    </Box>
  );
}

function FaxBox() {
  const items = useNodo((s) => s.faxes);
  const send = useNodo((s) => s.sendFax);
  const [peer, setPeer] = useState("");
  return (
    <Box title="Fax virtuale">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(peer, 2);
          setPeer("");
        }}
      >
        <Input value={peer} onChange={(e) => setPeer(e.target.value)} placeholder="Destinatario" />
        <Button type="submit">Invia fax</Button>
      </form>
      <ul className="mt-3 divide-y divide-border">
        {items.map((f) => (
          <li key={f.id} className="py-2 text-sm">
            {f.dir === "in" ? "Ricevuto" : "Inviato"} · {f.peer} · {f.pages} pag. · {f.status}
          </li>
        ))}
      </ul>
    </Box>
  );
}

function WikiBox() {
  const pages = useNodo((s) => s.wiki);
  const add = useNodo((s) => s.addWiki);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <Box title="Wiki">
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(title, body);
          setTitle("");
          setBody("");
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo" />
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Testo" />
        <Button type="submit" className="w-fit">
          Pubblica
        </Button>
      </form>
      <ul className="mt-4 space-y-3">
        {pages.map((w) => (
          <li key={w.id}>
            <p className="text-sm font-medium">{w.title}</p>
            <p className="text-sm text-muted">{w.body}</p>
          </li>
        ))}
      </ul>
    </Box>
  );
}

function HotelBox() {
  const wakes = useNodo((s) => s.wakes);
  const add = useNodo((s) => s.addWake);
  const [room, setRoom] = useState("");
  const [guest, setGuest] = useState("");
  const [time, setTime] = useState("07:00");
  return (
    <Box title="Hotel">
      <form
        className="grid gap-2 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          add(room, guest, time);
          setRoom("");
          setGuest("");
        }}
      >
        <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Camera" />
        <Input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="Ospite" />
        <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="Sveglia" />
        <Button type="submit">Imposta sveglia</Button>
      </form>
      <ul className="mt-3 divide-y divide-border">
        {wakes.map((w) => (
          <li key={w.id} className="py-2 text-sm">
            Camera {w.room} · {w.guest} · {w.time}
          </li>
        ))}
      </ul>
    </Box>
  );
}

function Fatture() {
  const invoices = useNodo((s) => s.invoices);
  return (
    <Box title="Area clienti · più sedi">
      <ul className="divide-y divide-border">
        {invoices.map((i) => (
          <li key={i.id} className="flex justify-between py-2 text-sm">
            <span>
              {i.number} · {i.seat}
            </span>
            <span className="font-mono">{i.amount}</span>
          </li>
        ))}
      </ul>
    </Box>
  );
}

function Clara() {
  const setView = useNodo((s) => s.setView);
  const setGreeting = useNodo((s) => s.setGreeting);
  const greeting = useNodo((s) => s.greeting);
  return (
    <Box title="Clara · assistente">
      <p className="text-sm text-muted">
        Ti apre i pezzi dello studio. Non ascolta le linee vere. Non è il prodotto di altri.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setView("telefono")}>
          Apri centralino
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setView("segreteria")}>
          Segreteria
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setView("spedizioni")}>
          Spedizioni
        </Button>
      </div>
      <label className="mt-4 grid gap-1 text-sm">
        Testo segreteria
        <Input value={greeting} onChange={(e) => setGreeting(e.target.value)} />
      </label>
    </Box>
  );
}
