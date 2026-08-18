import { useEffect, useRef } from "react";
import type { Candle } from "@/lib/trading/candles";
import type { MarketAnalysis } from "@/lib/trading/analysis";
import { formatPrice, type Instrument } from "@/lib/trading/instruments";
import type { Position } from "@/lib/trading/types";

type Props = {
  candles: Candle[];
  instrument: Instrument;
  analysis: MarketAnalysis | null;
  positions: Position[];
  draft: { stopLoss: number | null; takeProfit: number | null };
};

export function PriceChart({ candles, instrument, analysis, positions, draft }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const paint = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#141518";
      ctx.fillRect(0, 0, width, height);

      const slice = candles.slice(-90);
      if (slice.length < 2) {
        ctx.fillStyle = "#8b8d92";
        ctx.font = "13px 'IBM Plex Sans', sans-serif";
        ctx.fillText("In attesa delle candele…", 20, 32);
        return;
      }

      const padL = 12;
      const padR = 68;
      const padT = 18;
      const padB = 22;
      const extras = [
        analysis?.ema20,
        analysis?.ema50,
        draft.stopLoss,
        draft.takeProfit,
        ...positions.flatMap((p) => [p.entry, p.stopLoss, p.takeProfit]),
      ].filter((v): v is number => typeof v === "number" && Number.isFinite(v));

      let min = Math.min(...slice.map((c) => c.low), ...extras);
      let max = Math.max(...slice.map((c) => c.high), ...extras);
      if (min === max) {
        min -= 1;
        max += 1;
      }
      const span = max - min;
      min -= span * 0.04;
      max += span * 0.04;

      const innerW = width - padL - padR;
      const innerH = height - padT - padB;
      const xAt = (i: number) => padL + (i + 0.5) * (innerW / slice.length);
      const yAt = (price: number) => padT + ((max - price) / (max - min)) * innerH;

      ctx.strokeStyle = "#2a2c31";
      ctx.lineWidth = 1;
      ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "#6a6c72";
      for (let g = 0; g <= 4; g += 1) {
        const y = padT + (innerH / 4) * g;
        const price = max - ((max - min) / 4) * g;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(width - padR + 6, y);
        ctx.stroke();
        ctx.fillText(formatPrice(price, instrument.digits), width - padR + 10, y + 3);
      }

      if (analysis?.ema50 != null) {
        drawEma(ctx, slice, analysis.ema50, yAt, xAt, "#6a6c72");
      }
      if (analysis?.ema20 != null) {
        drawPath(
          ctx,
          slice,
          yAt,
          xAt,
          "#d7dbe0",
          1.2,
        );
      }

      const cw = Math.max(2, innerW / slice.length - 2);
      slice.forEach((c, i) => {
        const x = xAt(i);
        const up = c.close >= c.open;
        ctx.strokeStyle = up ? "#7d9b7f" : "#c47a72";
        ctx.fillStyle = up ? "#7d9b7f" : "#c47a72";
        ctx.beginPath();
        ctx.moveTo(x, yAt(c.high));
        ctx.lineTo(x, yAt(c.low));
        ctx.stroke();
        const top = yAt(Math.max(c.open, c.close));
        const bot = yAt(Math.min(c.open, c.close));
        ctx.fillRect(x - cw / 2, top, cw, Math.max(1, bot - top));
      });

      const lines: Array<{ price: number; color: string; label: string; dash?: boolean }> = [];
      if (draft.stopLoss != null) {
        lines.push({ price: draft.stopLoss, color: "#c47a72", label: "SL", dash: true });
      }
      if (draft.takeProfit != null) {
        lines.push({ price: draft.takeProfit, color: "#7d9b7f", label: "TP", dash: true });
      }
      for (const p of positions) {
        if (p.symbol !== instrument.id) continue;
        lines.push({ price: p.entry, color: "#d7dbe0", label: p.side });
        lines.push({ price: p.stopLoss, color: "#c47a72", label: "SL" });
        lines.push({ price: p.takeProfit, color: "#7d9b7f", label: "TP" });
      }
      for (const line of lines) {
        const y = yAt(line.price);
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 1;
        ctx.setLineDash(line.dash ? [4, 4] : []);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(width - padR, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = line.color;
        ctx.font = "10px 'IBM Plex Sans', sans-serif";
        ctx.fillText(
          `${line.label} ${formatPrice(line.price, instrument.digits)}`,
          padL + 4,
          y - 4,
        );
      }
    };

    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [candles, instrument, analysis, positions, draft]);

  return <canvas ref={ref} className="size-full" />;
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  slice: Candle[],
  yAt: (n: number) => number,
  xAt: (i: number) => number,
  color: string,
  width: number,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  slice.forEach((c, i) => {
    const y = yAt(c.close);
    if (i === 0) ctx.moveTo(xAt(i), y);
    else ctx.lineTo(xAt(i), y);
  });
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawEma(
  ctx: CanvasRenderingContext2D,
  slice: Candle[],
  lastEma: number,
  yAt: (n: number) => number,
  xAt: (i: number) => number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.45;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  const y = yAt(lastEma);
  ctx.moveTo(xAt(0), y);
  ctx.lineTo(xAt(slice.length - 1), y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}
