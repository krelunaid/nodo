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
  { id: "giulia", name: "Giulia Rinaldi", role: "Progettazione", seat: "Milano", ext: "201", mobile: "347 882 11 04", photo: "/faces/giulia.jpg", presence: "available" },
  { id: "marco", name: "Marco Bellini", role: "Accoglienza", seat: "Milano", ext: "202", mobile: "339 440 78 12", photo: "/faces/marco.jpg", presence: "busy" },
  { id: "elena", name: "Elena Costa", role: "Amministrazione", seat: "Bergamo", ext: "203", mobile: "348 991 20 33", photo: "/faces/elena.jpg", presence: "available" },
  { id: "paolo", name: "Paolo Ferri", role: "Cantiere", seat: "Brescia", ext: "204", mobile: "333 671 55 80", photo: "/faces/paolo.jpg", presence: "away" },
  { id: "sara", name: "Sara Neri", role: "Commerciale", seat: "Milano", ext: "205", mobile: "340 228 09 71", photo: "/faces/sara.jpg", presence: "available" },
  { id: "luca", name: "Luca Marini", role: "Strutture", seat: "Milano", ext: "206", mobile: "333 118 40 22", photo: "/faces/luca.jpg", presence: "available" },
  { id: "irene", name: "Irene Galli", role: "Segreteria", seat: "Bergamo", ext: "207", mobile: "347 660 91 05", photo: "/faces/irene.jpg", presence: "away" },
  { id: "davide", name: "Davide Fontana", role: "Sicurezza", seat: "Brescia", ext: "208", mobile: "339 774 12 80", photo: "/faces/davide.jpg", presence: "busy" },
];
