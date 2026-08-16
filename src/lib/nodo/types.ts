export type Presence = "available" | "busy" | "away" | "offline";

export type Colleague = {
  id: string;
  name: string;
  role: string;
  seat: string;
  ext: string;
  mobile: string;
  presence: Presence;
  photo?: string;
};

export type CallDirection = "in" | "out";
export type CallStatus = "missed" | "answered" | "outgoing";

export type CallRecord = {
  id: string;
  peer: string;
  number: string;
  direction: CallDirection;
  status: CallStatus;
  at: number;
  seconds: number;
};

export type ActiveCall = {
  id: string;
  peer: string;
  number: string;
  direction: CallDirection;
  startedAt: number;
  muted: boolean;
  onHold: boolean;
  transferredTo?: string;
};

export type IncomingCall = {
  id: string;
  peer: string;
  number: string;
};

export type ChatMessage = {
  id: string;
  from: "me" | string;
  text: string;
  at: number;
  expiresAt?: number;
  file?: string;
};

export type Conversation = {
  id: string;
  title: string;
  kind: "direct" | "group";
  peerIds: string[];
  messages: ChatMessage[];
};

export type StickyNote = {
  id: string;
  body: string;
  hue: "sand" | "sage" | "rose" | "sky";
  at: number;
};

export type AgendaEvent = {
  id: string;
  title: string;
  when: string;
  with: string;
  day: number;
};

export type Voicemail = {
  id: string;
  from: string;
  number: string;
  at: number;
  seconds: number;
  text: string;
  heard: boolean;
};

export type ForwardRule = {
  noAnswer: boolean;
  toMobile: boolean;
  afterRings: number;
  fromHour: number;
  toHour: number;
};

export type DirectoryContact = {
  id: string;
  name: string;
  company: string;
  phone: string;
  visibility: "private" | "public";
  photo?: string;
};

export type Shipment = {
  id: string;
  kind: "raccomandata" | "telegramma" | "prioritaria";
  to: string;
  file?: string;
  at: number;
  price: string;
  status: string;
};

export type ViewId =
  | "oggi"
  | "telefono"
  | "posta"
  | "chat"
  | "note"
  | "agenda"
  | "registro"
  | "segreteria"
  | "rubrica"
  | "archivio"
  | "spedizioni"
  | "moduli"
  | "crm"
  | "impostazioni";

export type Punch = {
  id: string;
  who: string;
  seat: string;
  kind: "in" | "out";
  at: number;
};

export type FaxItem = {
  id: string;
  dir: "in" | "out";
  peer: string;
  pages: number;
  at: number;
  status: string;
};

export type WikiPage = {
  id: string;
  title: string;
  body: string;
};

export type Invoice = {
  id: string;
  seat: string;
  number: string;
  amount: string;
  at: number;
};

export type WakeCall = {
  id: string;
  room: string;
  guest: string;
  time: string;
};

export type ConferenceRoom = {
  open: boolean;
  people: string[];
  recording: boolean;
  listening: boolean;
};

export type CrmAccount = {
  id: string;
  name: string;
  company: string;
  phone: string;
  stage: string;
  value: string;
};

export type CrmActivity = {
  id: string;
  accountId: string;
  kind: "call" | "note";
  text: string;
  at: number;
};
