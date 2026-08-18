import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runCapitalProbe } from "./client.server";

const ProbeSchema = z.object({
  environment: z.enum(["demo", "live"]),
  identifier: z.string().min(1).max(200),
  apiKey: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
  confirmLive: z.boolean(),
});

export const probeCapital = createServerFn({ method: "POST" })
  .validator((data: unknown) => ProbeSchema.parse(data))
  .handler(async ({ data }) => {
    return runCapitalProbe(data);
  });
