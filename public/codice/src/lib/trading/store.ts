import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  resetBook: () => void;
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
          settings: { ...state.settings, style, ...preset.settings },
        }));
      },
      patchSettings: (patch) => {
        set((state) => ({ settings: { ...state.settings, ...patch } }));
      },
      openTrade: (input) => {
        const state = get();
        if (state.open.length >= state.settings.maxPositions) {
          return {
            ok: false,
            reason: `Massimo ${state.settings.maxPositions} operazioni insieme.`,
          };
        }
        const instrument = getInstrument(input.symbol);
        if (state.open.some((p) => p.group === instrument.group)) {
          return {
            ok: false,
            reason: "Gruppo già a mercato. Non raddoppiare il rischio correlato.",
          };
        }
        if (!(input.stopLoss > 0) || !(input.takeProfit > 0)) {
          return { ok: false, reason: "Stop loss e take profit obbligatori." };
        }
        const position: Position = {
          id: uid(),
          symbol: input.symbol,
          group: instrument.group,
          side: input.side,
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
    }),
    {
      name: "desk-paper-v1",
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
