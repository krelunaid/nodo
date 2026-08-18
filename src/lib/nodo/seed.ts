import type {
  AgendaEvent,
  Colleague,
  Conversation,
  DirectoryContact,
  StickyNote,
  Voicemail,
  CrmAccount,
} from "./types";

export const ME = {
  id: "me",
  name: "Chiara Valli",
  role: "Titolare",
  seat: "Milano · studio",
  ext: "200",
  mobile: "333 120 44 90",
};

export const COLLEAGUES: Colleague[] = [
  {
    id: "giulia",
    name: "Giulia Rinaldi",
    role: "Progettazione",
    seat: "Milano",
    ext: "201",
    mobile: "347 882 11 04",
    photo: "/faces/giulia.jpg",
    presence: "available",
  },
  {
    id: "marco",
    name: "Marco Bellini",
    role: "Accoglienza",
    seat: "Milano",
    ext: "202",
    mobile: "339 440 78 12",
    photo: "/faces/marco.jpg",
    presence: "busy",
  },
  {
    id: "elena",
    name: "Elena Costa",
    role: "Amministrazione",
    seat: "Bergamo",
    ext: "203",
    mobile: "348 991 20 33",
    photo: "/faces/elena.jpg",
    presence: "available",
  },
  {
    id: "paolo",
    name: "Paolo Ferri",
    role: "Cantiere",
    seat: "Brescia",
    ext: "204",
    mobile: "333 671 55 80",
    photo: "/faces/paolo.jpg",
    presence: "away",
  },
  {
    id: "sara",
    name: "Sara Neri",
    role: "Commerciale",
    seat: "Milano",
    ext: "205",
    mobile: "340 228 09 71",
    photo: "/faces/sara.jpg",
    presence: "available",
  },
  {
    id: "luca",
    name: "Luca Marini",
    role: "Strutture",
    seat: "Milano",
    ext: "206",
    mobile: "333 118 40 22",
    photo: "/faces/luca.jpg",
    presence: "available",
  },
  {
    id: "irene",
    name: "Irene Galli",
    role: "Segreteria",
    seat: "Bergamo",
    ext: "207",
    mobile: "347 660 91 05",
    photo: "/faces/irene.jpg",
    presence: "away",
  },
  {
    id: "davide",
    name: "Davide Fontana",
    role: "Sicurezza",
    seat: "Brescia",
    ext: "208",
    mobile: "339 774 12 80",
    photo: "/faces/davide.jpg",
    presence: "busy",
  },
];

export const SEED_CHATS: Conversation[] = [
  {
    id: "c-giulia",
    title: "Giulia Rinaldi",
    kind: "direct",
    peerIds: ["giulia"],
    messages: [
      {
        id: "m1",
        from: "giulia",
        text: "I disegni del piano terra sono in cartella condivisa. Controllo io le quote bagno?",
        at: Date.now() - 1000 * 60 * 42,
      },
      {
        id: "m2",
        from: "me",
        text: "Sì, e segnala se il vano scala resta sotto i 110.",
        at: Date.now() - 1000 * 60 * 38,
      },
    ],
  },
  {
    id: "c-studio",
    title: "Studio · tutti",
    kind: "group",
    peerIds: ["giulia", "marco", "elena", "paolo", "sara"],
    messages: [
      {
        id: "m3",
        from: "elena",
        text: "Fattura 148 inviata. Il cliente di Lecco chiede copia della raccomandata.",
        at: Date.now() - 1000 * 60 * 95,
      },
      {
        id: "m4",
        from: "sara",
        text: "Li richiamo io dopo pranzo. Tengo il 200 se qualcuno è in cantiere.",
        at: Date.now() - 1000 * 60 * 80,
      },
    ],
  },
];

export const SEED_NOTES: StickyNote[] = [
  {
    id: "n1",
    body: "Richiamare geometra 030 45 12 88 prima delle 16.",
    hue: "sand",
    at: Date.now() - 3600_000,
  },
  {
    id: "n2",
    body: "Consegna tavole via XX Settembre: giovedì 9:30.",
    hue: "sage",
    at: Date.now() - 7200_000,
  },
  {
    id: "n3",
    body: "Codice allarme archivio: solo titolari. Non in chat.",
    hue: "rose",
    at: Date.now() - 86400_000,
  },
];

export const SEED_AGENDA: AgendaEvent[] = [
  { id: "a1", title: "Sopralluogo via Solferino", when: "11:30", with: "Paolo Ferri", day: 0 },
  { id: "a2", title: "Call direzione lavori", when: "15:00", with: "Giulia Rinaldi", day: 0 },
  { id: "a3", title: "Revisione preventivo Lecco", when: "09:15", with: "Sara Neri", day: 1 },
];

export const SEED_CONTACTS: DirectoryContact[] = [
  { id: "k1", name: "Ufficio tecnico Comune", company: "Comune di Milano", phone: "02 8846 1200", visibility: "public" },
  { id: "k2", name: "Geometra Landi", company: "Studio Landi", phone: "030 45 12 88", visibility: "private" },
  { id: "k3", name: "Fornitore infissi", company: "VetroNord", phone: "039 220 118", visibility: "public" },
];

export const SEED_VOICE: Voicemail[] = [
  {
    id: "v1",
    from: "Ufficio tecnico Comune",
    number: "02 8846 1200",
    at: Date.now() - 1000 * 60 * 130,
    seconds: 38,
    text: "Chiediamo integrazione sulla pratica 44/B. Richiamate lo sportello 3.",
    heard: false,
  },
  {
    id: "v2",
    from: "Fornitore infissi",
    number: "039 220 118",
    at: Date.now() - 1000 * 60 * 400,
    seconds: 22,
    text: "Confermiamo consegna serramenti venerdì. Serve un recapito in cantiere.",
    heard: true,
  },
];

export const SEED_CRM: CrmAccount[] = [
  { id: "crm1", name: "Ufficio tecnico", company: "Comune di Milano", phone: "02 8846 1200", stage: "Pratica aperta", value: "—"},
  { id: "crm2", name: "Ing. Landi", company: "Studio Landi", phone: "030 45 12 88", stage: "Preventivo", value: "18.400 €"},
  { id: "crm3", name: "Sig.ra Colombo", company: "Privato · Lecco", phone: "0341 550 220", stage: "Cliente", value: "4.280 €"},
];
