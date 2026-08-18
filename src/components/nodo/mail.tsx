import { useState } from "react";
import { Avatar } from "@/components/nodo/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime } from "@/lib/nodo/format";
import { useNodo } from "@/lib/nodo/store";
import { cn } from "@/lib/utils";

export function MailPanel() {
  const chats = useNodo((s) => s.chats);
  const chatId = useNodo((s) => s.chatId);
  const setChat = useNodo((s) => s.setChat);
  const sendChat = useNodo((s) => s.sendChat);
  const colleagues = useNodo((s) => s.colleagues);
  const [text, setText] = useState("");
  const [file, setFile] = useState("");
  const groups = chats.filter((c) => c.kind === "group");
  const current = groups.find((c) => c.id === chatId) ?? groups[0];

  return (
    <div className="grid min-h-[420px] overflow-hidden rounded-lg border border-border bg-surface md:grid-cols-[240px_1fr]">
      <aside className="border-b border-border md:border-r md:border-b-0">
        {groups.length === 0 && (
          <p className="p-4 text-sm text-muted">
            Dal telefono trascina due o più persone nel riquadro gruppo, poi apri la posta. Tutti vedono lo stesso messaggio.
          </p>
        )}
        {groups.map((c) => (
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
            <span className="text-xs text-muted">{c.peerIds.length} destinatari</span>
          </button>
        ))}
      </aside>
      <div className="flex min-h-0 flex-col">
        {current && (
          <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
            {current.peerIds.map((id) => {
              const p = colleagues.find((c) => c.id === id);
              return p ? <Avatar key={id} id={p.id} name={p.name} size="sm" /> : null;
            })}
          </div>
        )}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {current?.messages.map((m) => (
            <article
              key={m.id}
              className={cn(
                "max-w-[90%] rounded-md px-3 py-2 text-sm",
                m.from === "me" ? "ml-auto bg-accent text-accent-fg" : "bg-bg",
              )}
            >
              <p>{m.text}</p>
              <p className={cn("mt-1 text-[11px]", m.from === "me" ? "opacity-70" : "text-subtle")}>
                {formatTime(m.at)} · visto dal gruppo
              </p>
            </article>
          ))}
        </div>
        <form
          className="flex flex-col gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!current) return;
            setChat(current.id);
            sendChat(text, false, file || undefined);
            setText("");
            setFile("");
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={current ? "Scrivi al gruppo: lo vedono tutti" : "Prima crea un gruppo dal telefono"}
            disabled={!current}
          />
          <Input
            value={file}
            onChange={(e) => setFile(e.target.value)}
            placeholder="Allega (es. fattura.pdf) — lo vedono tutti"
            disabled={!current}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={(!text.trim() && !file.trim()) || !current}>
              Invia a tutti
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
