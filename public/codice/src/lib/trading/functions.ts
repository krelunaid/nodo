import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { INSTRUMENTS } from "./instruments";
import { loadMarket } from "./market.server";
import { runDurationStudy } from "./study.server";

const Tf = z.enum(["5m", "15m", "1h", "4h"]);

export const getMarket = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ symbol: z.string().min(1).max(16), timeframe: Tf }).parse(data),
  )
  .handler(async ({ data }) => {
    return loadMarket(data.symbol, data.timeframe);
  });

export const scanMarkets = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ timeframe: Tf }).parse(data))
  .handler(async ({ data }) => {
    const rows = await Promise.all(
      INSTRUMENTS.map((item) => loadMarket(item.id, data.timeframe)),
    );
    return rows;
  });

export const getDurationStudy = createServerFn({ method: "POST" }).handler(async () => {
  return runDurationStudy();
});

