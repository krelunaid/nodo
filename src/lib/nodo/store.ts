import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  COLLEAGUES,
  SEED_AGENDA,
  SEED_CHATS,
  SEED_CONTACTS,
  SEED_NOTES,
  SEED_VOICE,
  SEED_CRM,
} from "./seed";
import type {
  ActiveCall,
  AgendaEvent,
  CallRecord,
  Colleague,
  Conversation,
  ConferenceRoom,
  DirectoryContact,
  FaxItem,
  ForwardRule,
  IncomingCall,
  Invoice,
  Punch,
  Shipment,
  StickyNote,
  ViewId,
  Voicemail,
  WakeCall,
  WikiPage,
  DeviceId,
  CrmAccount,
  CrmActivity,
} from "./types";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

type NodoState = {
  view: ViewId;
  colleagues: Colleague[];
  contacts: DirectoryContact[];
  shipments: Shipment[];
  punches: Punch[];
  faxes: FaxItem[];
  wiki: WikiPage[];
  invoices: Invoice[];
  wakes: WakeCall[];
  conference: ConferenceRoom;
  companyCli: boolean;
  greeting: string;
  crm: CrmAccount[];
  crmLog: CrmActivity[];
  crmId: string;
  calls: CallRecord[];
  active: ActiveCall | null;
  incoming: IncomingCall | null;
  parked: ActiveCall | null;
  chats: Conversation[];
  chatId: string;
  tray: string[];
  notes: StickyNote[];
  agenda: AgendaEvent[];
  voicemail: Voicemail[];
  forward: ForwardRule;
  setView: (view: ViewId) => void;
  setChat: (id: string) => void;
  sendChat: (text: string, timed?: boolean, file?: string) => void;
  addToTray: (id: string) => void;
  clearTray: () => void;
  openGroupFromTray: () => string | null;
  passCall: (colleagueId: string) => void;
  passToMobile: (colleagueId: string) => void;
  setColleaguePhoto: (id: string, photo: string) => void;
  setContactPhoto: (id: string, photo: string) => void;
  addNote: (body: string, hue: StickyNote["hue"]) => void;
  removeNote: (id: string) => void;
  addEvent: (title: string, when: string, withWho: string, day?: number) => void;
  moveEvent: (id: string, day: number) => void;
  addContact: (name: string, company: string, phone: string) => void;
  addColleague: (name: string, ext: string, mobile: string, seat: string) => void;
  addShipment: (kind: Shipment["kind"], to: string, file?: string) => void;
  punch: (kind: Punch["kind"], seat: string) => void;
  sendFax: (peer: string, pages: number) => void;
  addWiki: (title: string, body: string) => void;
  addWake: (room: string, guest: string, time: string) => void;
  toggleConference: () => void;
  addToConference: (name: string) => void;
  toggleRecord: () => void;
  toggleListen: () => void;
  toggleCli: () => void;
  setGreeting: (text: string) => void;
  importContacts: (raw: string) => number;
  exportContacts: () => string;
  setCrm: (id: string) => void;
  addCrmNote: (text: string) => void;
  matchCrm: (number: string) => CrmAccount | undefined;
  startCall: (peer: string, number: string, direction?: "in" | "out") => void;
  endCall: (status?: CallRecord["status"]) => void;
  toggleMute: () => void;
  toggleHold: () => void;
  transferTo: (colleagueId: string) => void;
  offerIncoming: (peer: string, number: string) => void;
  acceptIncoming: () => void;
  declineIncoming: () => void;
  markVoice: (id: string) => void;
  setForward: (patch: Partial<ForwardRule>) => void;
  parkCall: () => void;
  unpark: () => void;
  claraRun: (text: string) => string;
  devices: Record<DeviceId, boolean>;
  setDevice: (id: DeviceId, on: boolean) => void;
  onDuty: boolean;
  setOnDuty: (on: boolean) => void;
  sip: { host: string; user: string; pass: string; tried: boolean };
  setSip: (patch: Partial<{ host: string; user: string; pass: string; tried: boolean }>) => void;
  shell: "desk" | "phone";
  setShell: (shell: "desk" | "phone") => void;
};

export const useNodo = create<NodoState>()(
  persist(
    (set, get) => ({
      view: "oggi",
      colleagues: COLLEAGUES,
      contacts: SEED_CONTACTS,
      punches: [
        { id: "p1", who: "Chiara Valli", seat: "Milano", kind: "in", at: Date.now() - 3600_000 * 3 },
        { id: "p2", who: "Elena Costa", seat: "Bergamo", kind: "in", at: Date.now() - 3600_000 * 2 },
      ],
      faxes: [
        { id: "f1", dir: "in", peer: "Comune di Milano", pages: 3, at: Date.now() - 86400_000, status: "Ricevuto" },
      ],
      wiki: [
        { id: "w1", title: "Come si passa una chiamata", body: "Trascina la scheda in linea sull'icona del collega. Assistito: parli prima, poi rilasci." },
        { id: "w2", title: "Interni", body: "200–209 Milano, 210–219 Bergamo. Stesso centralino, sedi diverse." },
      ],
      invoices: [
        { id: "i1", seat: "Milano", number: "2026-148", amount: "4.280,00 €", at: Date.now() - 86400_000 * 4 },
        { id: "i2", seat: "Bergamo", number: "2026-031", amount: "960,00 €", at: Date.now() - 86400_000 * 9 },
      ],
      wakes: [{ id: "h1", room: "214", guest: "Rossi", time: "07:00" }],
      conference: { open: false, people: [], recording: false, listening: false },
      companyCli: true,
      greeting: "Studio Valli, sono la segreteria. Lasciate nome e motivo della chiamata.",
      crm: SEED_CRM,
      crmLog: [
        { id: "ca1", accountId: "crm3", kind: "call", text: "Richiamata su fattura 148", at: Date.now() - 86400_000 },
      ],
      crmId: "crm2",
      shipments: [
        {
          id: "s1",
          kind: "raccomandata",
          to: "Comune di Milano",
          file: "pratica-44B.pdf",
          at: Date.now() - 86400_000 * 2,
          price: "7,80 €",
          status: "Accettata · in consegna",
        },
      ],
      calls: [
        {
          id: "r1",
          peer: "Elena Costa",
          number: "203",
          direction: "in",
          status: "answered",
          at: Date.now() - 1000 * 60 * 50,
          seconds: 186,
        },
        {
          id: "r2",
          peer: "Comune · sportello 3",
          number: "02 8846 1200",
          direction: "in",
          status: "missed",
          at: Date.now() - 1000 * 60 * 140,
          seconds: 0,
        },
      ],
      active: null,
      incoming: null,
      parked: null,
      chats: SEED_CHATS,
      chatId: "c-giulia",
      tray: [],
      notes: SEED_NOTES,
      agenda: SEED_AGENDA,
      voicemail: SEED_VOICE,
      forward: { noAnswer: true, toMobile: true, afterRings: 4, fromHour: 9, toHour: 18 },
      devices: { computer: true, phone: true, glasses: true },
      setDevice: (id, on) => set((s) => ({ devices: { ...s.devices, [id]: on } })),
      onDuty: false,
      setOnDuty: (onDuty) => set({ onDuty }),
      sip: { host: "", user: "", pass: "", tried: false },
      setSip: (patch) => set((s) => ({ sip: { ...s.sip, ...patch } })),
      shell: "desk",
      setShell: (shell) => set({ shell }),
      setView: (view) => set({ view }),
      setChat: (chatId) => set({ chatId }),
      sendChat: (text, timed, file) => {
        const clean = text.trim();
        if (!clean && !file) return;
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === s.chatId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: uid(),
                      from: "me" as const,
                      text: clean || (file ? `Allegato: ${file}` : ""),
                      at: Date.now(),
                      expiresAt: timed ? Date.now() + 1000 * 60 * 30 : undefined,
                      file,
                    },
                  ],
                }
              : c,
          ),
        }));
      },
      addNote: (body, hue) => {
        const clean = body.trim();
        if (!clean) return;
        set((s) => ({ notes: [{ id: uid(), body: clean, hue, at: Date.now() }, ...s.notes] }));
      },
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      addEvent: (title, when, withWho, day = 0) => {
        if (!title.trim()) return;
        set((s) => ({
          agenda: [
            { id: uid(), title: title.trim(), when: when || "—", with: withWho || "—", day },
            ...s.agenda,
          ],
        }));
      },
      moveEvent: (id, day) =>
        set((s) => ({ agenda: s.agenda.map((e) => (e.id === id ? { ...e, day } : e)) })),
      addColleague: (name, ext, mobile, seat) => {
        const n = name.trim();
        const e = ext.trim();
        if (!n || !e) return;
        set((s) => ({
          colleagues: [
            ...s.colleagues,
            {
              id: uid(),
              name: n,
              role: "Interno",
              seat: seat.trim() || "Studio",
              ext: e,
              mobile: mobile.trim() || e,
              presence: "available",
            },
          ],
        }));
      },
      addContact: (name, company, phone) => {
        if (!name.trim() || !phone.trim()) return;
        set((s) => ({
          contacts: [{ id: uid(), name: name.trim(), company: company.trim(), phone: phone.trim(), visibility: "private" }, ...s.contacts],
        }));
      },
      punch: (kind, seat) =>
        set((s) => ({
          punches: [{ id: uid(), who: "Chiara Valli", seat, kind, at: Date.now() }, ...s.punches],
        })),
      sendFax: (peer, pages) => {
        if (!peer.trim()) return;
        set((s) => ({
          faxes: [
            { id: uid(), dir: "out", peer: peer.trim(), pages: pages || 1, at: Date.now(), status: "Inviato · in archivio" },
            ...s.faxes,
          ],
        }));
      },
      addWiki: (title, body) => {
        if (!title.trim()) return;
        set((s) => ({ wiki: [{ id: uid(), title: title.trim(), body: body.trim() }, ...s.wiki] }));
      },
      addWake: (room, guest, time) => {
        if (!room.trim()) return;
        set((s) => ({ wakes: [{ id: uid(), room: room.trim(), guest: guest.trim(), time: time || "07:00" }, ...s.wakes] }));
      },
      toggleConference: () =>
        set((s) => ({
          conference: s.conference.open
            ? { open: false, people: [], recording: false, listening: false }
            : { ...s.conference, open: true, people: s.conference.people.length ? s.conference.people : ["Chiara Valli"] },
        })),
      addToConference: (name) =>
        set((s) => ({
          conference: {
            ...s.conference,
            open: true,
            people: s.conference.people.includes(name) ? s.conference.people : [...s.conference.people, name],
          },
        })),
      toggleRecord: () =>
        set((s) => ({ conference: { ...s.conference, recording: !s.conference.recording } })),
      toggleListen: () =>
        set((s) => ({ conference: { ...s.conference, listening: !s.conference.listening } })),
      toggleCli: () => set((s) => ({ companyCli: !s.companyCli })),
      setGreeting: (text) => set({ greeting: text }),
      importContacts: (raw) => {
        const rows = raw.split(/\n/).map((l) => l.split(/[;,]|\t/)).filter((r) => r[0]?.trim());
        if (!rows.length) return 0;
        set((s) => ({
          contacts: [
            ...rows.map((r) => ({
              id: uid(),
              name: r[0]?.trim() ?? "Senza nome",
              company: r[1]?.trim() ?? "",
              phone: r[2]?.trim() ?? "",
              visibility: "private" as const,
            })),
            ...s.contacts,
          ],
        }));
        return rows.length;
      },
      exportContacts: () =>
        get()
          .contacts.map((c) => `${c.name};${c.company};${c.phone};${c.visibility}`)
          .join("\n"),
      addShipment: (kind, to, file) => {
        if (!to.trim()) return;
        const price = kind === "telegramma" ? "4,20 €" : kind === "prioritaria" ? "3,10 €" : "7,80 €";
        set((s) => ({
          shipments: [
            {
              id: uid(),
              kind,
              to: to.trim(),
              file,
              at: Date.now(),
              price,
              status: "Accettata · in lavorazione",
            },
            ...s.shipments,
          ],
        }));
      },
      setCrm: (crmId) => set({ crmId }),
      addCrmNote: (text) => {
        const clean = text.trim();
        const id = get().crmId;
        if (!clean || !id) return;
        set((s) => ({
          crmLog: [{ id: uid(), accountId: id, kind: "note", text: clean, at: Date.now() }, ...s.crmLog],
        }));
      },
      matchCrm: (number) => {
        const n = number.replace(/\D/g, "");
        return get().crm.find((a) => a.phone.replace(/\D/g, "") === n);
      },
      startCall: (peer, number, direction = "out") => {
        if (get().active) return;
        const hit = get().matchCrm(number);
        if (hit) {
          set((s) => ({
            crmId: hit.id,
            crmLog: [
              {
                id: uid(),
                accountId: hit.id,
                kind: "call",
                text: `${direction === "in" ? "In arrivo" : "In uscita"} · ${number}`,
                at: Date.now(),
              },
              ...s.crmLog,
            ],
          }));
        }
        set({
          incoming: null,
      parked: null,
          active: {
            id: uid(),
            peer,
            number,
            direction,
            startedAt: Date.now(),
            muted: false,
            onHold: false,
          },
        });
      },
      endCall: (status) => {
        const active = get().active;
        if (!active) return;
        const seconds = Math.max(1, Math.round((Date.now() - active.startedAt) / 1000));
        const record: CallRecord = {
          id: active.id,
          peer: active.transferredTo ? `${active.peer} → ${active.transferredTo}` : active.peer,
          number: active.number,
          direction: active.direction,
          status: status ?? (active.direction === "out" ? "outgoing" : "answered"),
          at: active.startedAt,
          seconds,
        };
        set((s) => ({ active: null, calls: [record, ...s.calls] }));
      },
      toggleMute: () =>
        set((s) => (s.active ? { active: { ...s.active, muted: !s.active.muted } } : s)),
      toggleHold: () =>
        set((s) => (s.active ? { active: { ...s.active, onHold: !s.active.onHold } } : s)),
      transferTo: (colleagueId) => {
        const person = get().colleagues.find((c) => c.id === colleagueId);
        const active = get().active;
        if (!person || !active) return;
        set({ active: { ...active, transferredTo: person.name } });
        window.setTimeout(() => {
          const still = get().active;
          if (still?.id === active.id) get().endCall("answered");
        }, 900);
      },
      offerIncoming: (peer, number) => {
        if (get().active || get().incoming) return;
        set({ incoming: { id: uid(), peer, number } });
      },
      acceptIncoming: () => {
        const inc = get().incoming;
        if (!inc) return;
        get().startCall(inc.peer, inc.number, "in");
      },
      declineIncoming: () => {
        const inc = get().incoming;
        if (!inc) return;
        set((s) => ({
          incoming: null,
      parked: null,
          calls: [
            {
              id: inc.id,
              peer: inc.peer,
              number: inc.number,
              direction: "in",
              status: "missed",
              at: Date.now(),
              seconds: 0,
            },
            ...s.calls,
          ],
        }));
      },
      markVoice: (id) =>
        set((s) => ({
          voicemail: s.voicemail.map((v) => (v.id === id ? { ...v, heard: true } : v)),
        })),
      setForward: (patch) => set((s) => ({ forward: { ...s.forward, ...patch } })),
      setColleaguePhoto: (id, photo) =>
        set((s) => ({
          colleagues: s.colleagues.map((c) => (c.id === id ? { ...c, photo } : c)),
        })),
      setContactPhoto: (id, photo) =>
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, photo } : c)),
        })),
      passToMobile: (colleagueId) => {
        const person = get().colleagues.find((c) => c.id === colleagueId);
        if (!person) return;
        const active = get().active;
        const inc = get().incoming;
        if (active) {
          set({ active: { ...active, transferredTo: `${person.name} · cell` } });
          window.setTimeout(() => {
            const still = get().active;
            if (still?.id === active.id) get().endCall("answered");
          }, 900);
          return;
        }
        if (inc) {
          set((s) => ({
            incoming: null,
            calls: [
              {
                id: inc.id,
                peer: `${inc.peer} → ${person.name} cell`,
                number: person.mobile,
                direction: "in",
                status: "answered",
                at: Date.now(),
                seconds: 2,
              },
              ...s.calls,
            ],
          }));
        }
      },
      parkCall: () => {
        const active = get().active;
        if (!active) return;
        set({ active: null, parked: { ...active, onHold: true } });
      },
      unpark: () => {
        const parked = get().parked;
        if (!parked || get().active) return;
        set({ parked: null, active: { ...parked, onHold: false } });
      },
      claraRun: (text) => {
        const q = text.trim().toLowerCase();
        if (!q) return "Dimmi cosa fare.";
        const people = get().colleagues;
        const crm = get().crm;
        if (q.startsWith("chiama ")) {
          const who = q.slice(7);
          const person = people.find((c) => c.name.toLowerCase().includes(who) || c.ext === who);
          const acc = crm.find((c) => c.company.toLowerCase().includes(who) || c.name.toLowerCase().includes(who));
          if (person) {
            get().startCall(person.name, person.ext);
            return `Chiamo ${person.name}.`;
          }
          if (acc) {
            get().startCall(acc.company, acc.phone);
            return `Chiamo ${acc.company}.`;
          }
          return "Non trovo quel numero.";
        }
        if (q.includes("passa")) {
          const who = q.replace("passa a ", "").replace("passa ", "");
          const person = people.find((c) => c.name.toLowerCase().includes(who));
          if (person) {
            get().passCall(person.id);
            return `Passo a ${person.name}.`;
          }
          return "Nessun collega con quel nome.";
        }
        if (q.includes("crm") || q.includes("pratica")) {
          get().setView("crm");
          return "Apro il CRM.";
        }
        if (q.includes("centralino")) {
          get().setView("telefono");
          return "Apro il centralino.";
        }
        if (q.includes("oggi")) {
          get().setView("oggi");
          return "Ecco oggi.";
        }
        return "Posso: chiama Landi · passa Elena · apri CRM · centralino.";
      },
      addToTray: (id) => set((s) => ({ tray: s.tray.includes(id) ? s.tray : [...s.tray, id] })),
      clearTray: () => set({ tray: [] }),
      openGroupFromTray: () => {
        const s = get();
        const ids = [...new Set(s.tray)].filter(Boolean);
        if (ids.length < 2) return null;
        const names = ids
          .map((id) => s.colleagues.find((c) => c.id === id)?.name.split(" ")[0] ?? id)
          .join(", ");
        const existing = s.chats.find(
          (c) =>
            c.kind === "group" &&
            c.peerIds.length === ids.length &&
            ids.every((id) => c.peerIds.includes(id)),
        );
        if (existing) {
          set({ chatId: existing.id, view: "posta", tray: [] });
          return existing.id;
        }
        const id = uid();
        const convo: Conversation = {
          id,
          title: `Gruppo · ${names}`,
          kind: "group",
          peerIds: ids,
          messages: [
            {
              id: uid(),
              from: "me",
              text: "Gruppo aperto. Chi scrive qui lo vedono tutti i membri.",
              at: Date.now(),
            },
          ],
        };
        set({ chats: [convo, ...s.chats], chatId: id, view: "posta", tray: [] });
        return id;
      },
      passCall: (colleagueId) => {
        const person = get().colleagues.find((c) => c.id === colleagueId);
        if (!person) return;
        const active = get().active;
        const inc = get().incoming;
        if (active) {
          get().transferTo(colleagueId);
          return;
        }
        if (inc) {
          set((s) => ({
            incoming: null,
      parked: null,
            calls: [
              {
                id: inc.id,
                peer: `${inc.peer} → ${person.name}`,
                number: inc.number,
                direction: "in",
                status: "answered",
                at: Date.now(),
                seconds: 2,
              },
              ...s.calls,
            ],
          }));
        }
      },
    }),
    { name: "nodo-desk-v11" },
  ),
);
