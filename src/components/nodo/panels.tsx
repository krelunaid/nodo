import { useState } from "react";
import { Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractNumbers, formatDuration, formatTime, formatWhen } from "@/lib/nodo/format";
import { ME } from "@/lib/nodo/seed";
import { useNodo } from "@/lib/nodo/store";
import { cn } from "@/lib/utils";
import { isElectron } from "@/lib/nodo/runtime";

export function ChatPanel() {
  const chats = useNodo((s) => s.chats);
  const chatId = useNodo((s) => s.chatId);
  const setChat = useNodo((s) => s.setChat);
  const sendChat = useNodo((s) => s.sendChat);
  const [text, setText] = useState("");
  const [timed, setTimed] = useState(false);
  const current = chats.find((c) => c.id === chatId) ?? chats[0];

  return (
    <div className="grid min-h-[420px] overflow-hidden rounded-xl border border-border bg-surface shadow-panel md:grid-cols-[220px_1fr]">
      <aside className="border-b border-border md:border-r md:border-b-0">
        {chats.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChat(c.id)}
            className={cn(
              "flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-3 text-left",
              c.id === current?.id ? "bg-elevated" : "hover:bg-bg",
            )}
          >
            <span className="text-sm font-medium">{c.title}</span>
            <span className="line-clamp-1 text-xs text-muted">
              {c.messages.at(-1)?.text ?? "Nessun messaggio"}
            </span>
          </button>
        ))}
      </aside>
      <div className="flex min-h-0 flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {current?.messages.map((m) => (
            <article
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                m.from === "me" ? "ml-auto bg-accent text-accent-fg" : "bg-bg",
              )}
            >
              <p>{m.text}</p>
              <p className={cn("mt-1 text-[11px]", m.from === "me" ? "opacity-70" : "text-subtle")}>
                {formatTime(m.at)}
                {m.expiresAt ? " · a tempo" : ""}
              </p>
            </article>
          ))}
        </div>
        <form
          className="flex flex-col gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            sendChat(text, timed);
            setText("");
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Scrivi al gruppo o al collega"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={timed}
                onChange={(e) => setTimed(e.target.checked)}
                className="size-4 accent-current"
              />
              Messaggio a tempo (30 min)
            </label>
            <Button type="submit" size="sm" disabled={!text.trim()}>
              Invia
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NotesPanel() {
  const notes = useNodo((s) => s.notes);
  const addNote = useNodo((s) => s.addNote);
  const removeNote = useNodo((s) => s.removeNote);
  const startCall = useNodo((s) => s.startCall);
  const [body, setBody] = useState("");
  const [hue, setHue] = useState<"sand" | "sage" | "rose" | "sky">("sand");

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-panel">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">Perle · promemoria</p>
      <p className="mt-1 text-sm text-muted">Non sono post-it. Sono sfere. Un numero dentro si chiama al tocco.</p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          addNote(body, hue);
          setBody("");
        }}
      >
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Promemoria, anche con un numero" />
        <select
          className="h-11 rounded-sm border border-border bg-bg px-3 text-sm"
          value={hue}
          onChange={(e) => setHue(e.target.value as typeof hue)}
        >
          <option value="sand">Sabbia</option>
          <option value="sage">Salvia</option>
          <option value="rose">Rosa</option>
          <option value="sky">Cielo</option>
        </select>
        <Button type="submit">Nuova perla</Button>
      </form>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((n) => (
          <li
            key={n.id}
            className={cn(
              "flex min-h-40 flex-col rounded-full p-5 text-center shadow-panel",
              n.hue === "sand" && "bg-elevated",
              n.hue === "sage" && "bg-ok-fg text-fg",
              n.hue === "rose" && "bg-danger-fg text-fg",
              n.hue === "sky" && "border border-border bg-surface",
            )}
          >
            <p className="text-sm leading-relaxed">{n.body}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {extractNumbers(n.body).map((num) => (
                <Button
                  key={num}
                  size="sm"
                  variant="secondary"
                  onClick={() => startCall(num, num.replace(/\s/g, ""))}
                >
                  <Phone /> {num}
                </Button>
              ))}
              <Button size="icon" variant="ghost" onClick={() => removeNote(n.id)} aria-label="Elimina">
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AgendaPanel() {
  const agenda = useNodo((s) => s.agenda);
  const addEvent = useNodo((s) => s.addEvent);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [withWho, setWithWho] = useState("");

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-panel">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">Agenda dello studio</p>
      <form
        className="mt-3 grid gap-2 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          addEvent(title, when, withWho);
          setTitle("");
          setWhen("");
          setWithWho("");
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Impegno" />
        <Input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="Quando" />
        <Input value={withWho} onChange={(e) => setWithWho(e.target.value)} placeholder="Con chi" />
        <Button type="submit">Metti in agenda</Button>
      </form>
      <ul className="mt-4 divide-y divide-border">
        {agenda.map((e) => (
          <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <div>
              <p className="text-sm font-medium">{e.title}</p>
              <p className="text-xs text-muted">{e.with}</p>
            </div>
            <p className="font-mono text-xs text-subtle">{e.when}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LogPanel() {
  const calls = useNodo((s) => s.calls);
  const startCall = useNodo((s) => s.startCall);
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-panel">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">Registro</p>
      <ul className="mt-3 divide-y divide-border">
        {calls.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="text-sm font-medium">{c.peer}</p>
              <p className="text-xs text-muted">
                {c.status === "missed" ? "Persa" : c.direction === "in" ? "Entrata" : "Uscita"} · {c.number} ·{" "}
                {formatWhen(c.at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-subtle tabular-nums">
                {c.seconds ? formatDuration(c.seconds) : "—"}
              </span>
              <Button size="sm" variant="secondary" onClick={() => startCall(c.peer, c.number)}>
                <Phone />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function VoicePanel() {
  const items = useNodo((s) => s.voicemail);
  const mark = useNodo((s) => s.markVoice);
  const startCall = useNodo((s) => s.startCall);
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-panel">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">Segreteria</p>
      <ul className="mt-3 space-y-3">
        {items.map((v) => (
          <li key={v.id} className="rounded-lg border border-border bg-bg p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {v.from}
                {!v.heard && <span className="ml-2 text-xs text-warn">nuova</span>}
              </p>
              <p className="font-mono text-xs text-subtle">
                {formatWhen(v.at)} · {formatDuration(v.seconds)}
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{v.text}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => startCall(v.from, v.number)}>
                <Phone /> Richiama
              </Button>
              {!v.heard && (
                <Button size="sm" variant="ghost" onClick={() => mark(v.id)}>
                  Segna ascoltata
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SettingsPanel() {
  const forward = useNodo((s) => s.forward);
  const setForward = useNodo((s) => s.setForward);
  const sip = useNodo((s) => s.sip);
  const setSip = useNodo((s) => s.setSip);
  const colleagues = useNodo((s) => s.colleagues);
  const addColleague = useNodo((s) => s.addColleague);
  const [neo, setNeo] = useState({ name: "", ext: "", mobile: "", seat: "Studio" });
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-panel">
      <div className="mb-5 rounded-3xl border border-border bg-bg p-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Collega il centralino</p>
        <p className="mt-2 text-sm text-muted">Tre caselle. Te le dà lo studio. La password resta qui, non in chat.</p>
        <div className="mt-3 grid gap-2">
          <label className="grid gap-1 text-sm">
            Server (indirizzo)
            <Input value={sip.host} placeholder="sip.studio.it" autoComplete="off" onChange={(e) => setSip({ host: e.target.value, tried: false })} />
          </label>
          <label className="grid gap-1 text-sm">
            Interno
            <Input value={sip.user} placeholder="200" autoComplete="off" onChange={(e) => setSip({ user: e.target.value, tried: false })} />
          </label>
          <label className="grid gap-1 text-sm">
            Password
            <Input type="password" value={sip.pass} placeholder="••••••••" autoComplete="new-password" onChange={(e) => setSip({ pass: e.target.value, tried: false })} />
          </label>
          <Button className="rounded-full" disabled={!sip.host.trim() || !sip.user.trim() || !sip.pass.trim()} onClick={() => setSip({ tried: true })}>
            Salva e prova
          </Button>
          {sip.tried ? (
            <p className="text-sm text-muted">Dati salvati su questo computer. La linea vera si attacca quando il server risponde. Oggi è il posto giusto.</p>
          ) : (
            <p className="text-xs text-muted">Non si spegne il telefono da tavolo. Questo si affianca.</p>
          )}
        </div>
      </div>
      <div className="mb-5 rounded-3xl border border-border bg-bg p-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Gli altri dello studio</p>
        <p className="mt-2 text-sm text-muted">
          Qui solo nome e interno — così li vedi sull’orb e in «Passa a». La loro password la mettono loro, sul loro Nodo.
        </p>
        <ul className="mt-3 space-y-2">
          {colleagues.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{c.name}</span>
              <span className="shrink-0 font-mono text-xs text-muted">int. {c.ext}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input placeholder="Nome" value={neo.name} onChange={(e) => setNeo({ ...neo, name: e.target.value })} />
          <Input placeholder="Interno (201)" value={neo.ext} onChange={(e) => setNeo({ ...neo, ext: e.target.value })} />
          <Input placeholder="Cellulare" value={neo.mobile} onChange={(e) => setNeo({ ...neo, mobile: e.target.value })} />
          <Input placeholder="Sede" value={neo.seat} onChange={(e) => setNeo({ ...neo, seat: e.target.value })} />
        </div>
        <Button
          className="mt-2 rounded-full"
          disabled={!neo.name.trim() || !neo.ext.trim()}
          onClick={() => {
            addColleague(neo.name, neo.ext, neo.mobile, neo.seat);
            setNeo({ name: "", ext: "", mobile: "", seat: "Studio" });
          }}
        >
          Aggiungi persona
        </Button>
      </div>
      {!isElectron() && (
      <div className="mb-5 rounded-3xl border border-border bg-bg p-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Installa sul computer</p>
        <p className="mt-2 text-sm text-muted">Windows: Nodo.exe. MacBook (M1–M4): Nodo.app. Prima volta: tasto destro → Apri.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/Nodo-Windows.zip" download className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm text-accent-fg">
            Scarica per Windows
          </a>
          <a href="/Nodo-MacBook.zip" download className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm">
            Scarica per Mac
          </a>
        </div>
        <p className="mt-3 text-sm text-muted">
          iPhone: Safari → Condividi → Aggiungi a Home. Si apre come un’app, icona sfera, senza barra del browser.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <a href="/install/LEGGIMI-INSTALLA.txt" className="text-sm text-accent">Istruzioni complete</a>
          <a href="/Nodo-Kreluna.pdf" download className="text-sm text-accent">Scarica il PDF</a>
          <a href="/Nodo-sul-serio.pdf" download className="text-sm text-accent">Quello che serve sul serio</a>
          <a href="/Nodo-dati-centralino.pdf" download className="text-sm text-accent">Dati centralino</a>
          <a href="/Nodo-progetto.zip" download className="text-sm text-accent">Salva il progetto</a>
        </div>
      </div>
      )}
      <p className="text-xs font-medium tracking-wide text-muted uppercase">Deviazioni</p>
      <p className="mt-2 max-w-xl text-sm text-muted">
        {ME.name} · interno {ME.ext} · {ME.mobile}. Le regole valgono solo in questo studio.
      </p>
      <div className="mt-4 grid gap-3">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-3 text-sm">
          Se non rispondo
          <input
            type="checkbox"
            className="size-4 accent-current"
            checked={forward.noAnswer}
            onChange={(e) => setForward({ noAnswer: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-3 text-sm">
          Passa al cellulare
          <input
            type="checkbox"
            className="size-4 accent-current"
            checked={forward.toMobile}
            onChange={(e) => setForward({ toMobile: e.target.checked })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Dopo quanti squilli
          <Input
            type="number"
            min={2}
            max={8}
            value={forward.afterRings}
            onChange={(e) => setForward({ afterRings: Number(e.target.value) || 4 })}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-sm">
            Dalle
            <Input
              type="number"
              min={0}
              max={23}
              value={forward.fromHour ?? 9}
              onChange={(e) => setForward({ fromHour: Number(e.target.value) || 9 })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Alle
            <Input
              type="number"
              min={1}
              max={24}
              value={forward.toHour ?? 18}
              onChange={(e) => setForward({ toHour: Number(e.target.value) || 18 })}
            />
          </label>
        </div>
        <p className="text-xs text-muted">Lunedì–venerdì, in questo orario. Fuori: segreteria.</p>
      </div>
    </section>
  );
}
