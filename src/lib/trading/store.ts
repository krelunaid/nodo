import { create } from "zustand";
import { persist } from "zustand/middleware";
import { canOpenStyle } from "./allocation";
import { errorLimit } from "./error-limit";
import { getInstrument } from "./instruments";
import {
  DEFAULT_SETTINGS,
  STYLES,
  type DeskSettings,
  type Side,
  type StyleId,
} from "./risk";
import type { ClosedTrade, Position } from "./types";

type DeskState = {
  settings: DeskSettings;
  equity: number;
  realized: number;
  open: Position[];
  journal: ClosedTrade[];
  applyStyle: (style: StyleId) => void;
  patchSettings: (patch: Partial<DeskSettings>) => void;
  openTrade: (input: {
    symbol: string;
    side: Side;
    size: number;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    riskAmount: number;
    quality: number;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  closeMany: (closed: ClosedTrade[]) => void;
  replaceOpen: (positions: Position[]) => void;
  resetBook: () => void;
  setCapital: (amount: number) => void;
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useDeskStore = create<DeskState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      equity: DEFAULT_SETTINGS.startingEquity,
      realized: 0,
      open: [],
      journal: [],
      applyStyle: (style) => {
        const preset = STYLES[style];
        set((state) => ({
          settings: { ...state.settings, style, ...preset.settings, minRr: state.settings.minRr },
        }));
      },
      patchSettings: (patch) => {
        set((state) => ({ settings: { ...state.settings, ...patch } }));
      },
      openTrade: (input) => {
        const state = get();
        const instrument = getInstrument(input.symbol);
        const style = state.settings.style;
        const gate = canOpenStyle({
          equity: state.equity,
          open: state.open,
          style,
          group: instrument.group,
        });
        if (!gate.ok) {
          return { ok: false, reason: gate.reasons[0] ?? "Regole capitale." };
        }
        const halt = errorLimit({ equity: state.equity, journal: state.journal });
        if (!halt.ok) {
          return { ok: false, reason: halt.reasons[0] ?? "Tetto errore." };
        }
        if (!(input.stopLoss > 0) || !(input.takeProfit > 0)) {
          return { ok: false, reason: "Stop loss e take profit obbligatori." };
        }
        const position: Position = {
          id: uid(),
          symbol: input.symbol,
          group: instrument.group,
          side: input.side,
          style,
          size: input.size,
          entry: input.entry,
          stopLoss: input.stopLoss,
          takeProfit: input.takeProfit,
          openedAt: Date.now(),
          timeStopAt: Date.now() + state.settings.timeStopMinutes * 60_000,
          riskAmount: input.riskAmount,
          quality: input.quality,
        };
        set({ open: [...state.open, position] });
        return { ok: true, id: position.id };
      },
      replaceOpen: (positions) => set({ open: positions }),
      closeMany: (closed) => {
        if (!closed.length) return;
        set((state) => {
          const ids = new Set(closed.map((c) => c.id));
          const pnl = closed.reduce((sum, c) => sum + c.pnl, 0);
          return {
            open: state.open.filter((p) => !ids.has(p.id)),
            journal: [...closed, ...state.journal].slice(0, 80),
            equity: state.equity + pnl,
            realized: state.realized + pnl,
          };
        });
      },
      resetBook: () => {
        const start = get().settings.startingEquity;
        set({ open: [], journal: [], equity: start, realized: 0 });
      },
      setCapital: (amount) => {
        set((state) => ({
          settings: { ...state.settings, startingEquity: amount },
          equity: amount,
          realized: 0,
          open: [],
          journal: [],
        }));
      },
    }),
    {
      name: "desk-paper-v3",
      partialize: (state) => ({
        settings: state.settings,
        equity: state.equity,
        realized: state.realized,
        open: state.open,
        journal: state.journal,
      }),
    },
  ),
);
