export const CAPITAL_HOSTS = {
  demo: "https://demo-api-capital.backend-capital.com",
  live: "https://api-capital.backend-capital.com",
} as const;

export type CapitalEnvironment = keyof typeof CAPITAL_HOSTS;

export type ProbeStep = {
  name: string;
  ok: boolean;
  detail: string;
};

export type ProbeAccount = {
  accountId: string;
  accountName: string;
  accountType: string;
  currency: string;
  status: string;
  preferred: boolean;
  balance: number | null;
  available: number | null;
  profitLoss: number | null;
};

export type ProbeResult = {
  ok: boolean;
  environment: CapitalEnvironment;
  host: string;
  latencyMs: number;
  steps: ProbeStep[];
  accounts: ProbeAccount[];
  session: {
    clientId: string | null;
    accountId: string | null;
    locale: string | null;
    timezoneOffset: number | null;
  } | null;
  error: { code: string | null; message: string } | null;
};

export type ProbeInput = {
  environment: CapitalEnvironment;
  identifier: string;
  apiKey: string;
  password: string;
  confirmLive: boolean;
};
