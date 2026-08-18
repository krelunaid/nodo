import {
  CAPITAL_HOSTS,
  type CapitalEnvironment,
  type ProbeAccount,
  type ProbeInput,
  type ProbeResult,
  type ProbeStep,
} from "./types";

const ALLOWED_HOSTS = new Set<string>(Object.values(CAPITAL_HOSTS));

type CapitalJson = Record<string, unknown>;

function asRecord(value: unknown): CapitalJson | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as CapitalJson)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readError(body: unknown, status: number): { code: string | null; message: string } {
  const rec = asRecord(body);
  const code = rec ? asString(rec.errorCode) : null;
  const map: Record<string, string> = {
    "error.invalid.details": "Identificativo o password API non validi.",
    "error.security.api-key-invalid": "API key non valida per questo ambiente.",
    "error.security.api-key-missing": "API key mancante.",
    "error.null.api.key": "API key mancante.",
    "error.invalid.api.key": "API key non riconosciuta.",
    "error.null.client.token": "Sessione assente. Il login non è andato a buon fine.",
    "error.security.client-token-invalid": "Token di sessione rifiutato.",
    "error.not-found.api-key": "API key inesistente su questo host.",
    "error.rejected.account-not-found": "Conto non trovato su questo ambiente.",
  };
  if (code && map[code]) return { code, message: map[code] };
  if (code) return { code, message: `Capital.com ha rifiutato la richiesta (${code}).` };
  return { code: null, message: `Risposta HTTP ${status} da Capital.com.` };
}

async function capitalRequest(
  host: string,
  path: string,
  init: {
    method: string;
    apiKey?: string;
    cst?: string;
    securityToken?: string;
    body?: unknown;
  },
): Promise<{
  status: number;
  json: unknown;
  cst: string | null;
  securityToken: string | null;
}> {
  if (!ALLOWED_HOSTS.has(host)) {
    throw new Error("Host non consentito.");
  }

  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  if (init.apiKey) headers.set("X-CAP-API-KEY", init.apiKey);
  if (init.cst) headers.set("CST", init.cst);
  if (init.securityToken) headers.set("X-SECURITY-TOKEN", init.securityToken);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${host}/api/v1${path}`, {
      method: init.method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        json = { raw: text.slice(0, 200) };
      }
    }
    return {
      status: res.status,
      json,
      cst: res.headers.get("CST"),
      securityToken: res.headers.get("X-SECURITY-TOKEN"),
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseAccounts(body: unknown): ProbeAccount[] {
  const rec = asRecord(body);
  const list = rec && Array.isArray(rec.accounts) ? rec.accounts : [];
  return list.flatMap((item) => {
    const row = asRecord(item);
    if (!row) return [];
    const balance = asRecord(row.balance);
    return [
      {
        accountId: asString(row.accountId) ?? "—",
        accountName: asString(row.accountName) ?? "—",
        accountType: asString(row.accountType) ?? "—",
        currency: asString(row.currency) ?? "—",
        status: asString(row.status) ?? "—",
        preferred: row.preferred === true,
        balance: balance ? asNumber(balance.balance) : null,
        available: balance ? asNumber(balance.available) : null,
        profitLoss: balance ? asNumber(balance.profitLoss) : null,
      },
    ];
  });
}

export async function runCapitalProbe(input: ProbeInput): Promise<ProbeResult> {
  const environment: CapitalEnvironment = input.environment;
  const host = CAPITAL_HOSTS[environment];
  const steps: ProbeStep[] = [];
  const started = Date.now();

  const fail = (
    error: { code: string | null; message: string },
    extra?: ProbeStep,
  ): ProbeResult => ({
    ok: false,
    environment,
    host,
    latencyMs: Date.now() - started,
    steps: extra ? [...steps, extra] : steps,
    accounts: [],
    session: null,
    error,
  });

  if (environment === "live") {
    return fail({
      code: "live-locked",
      message:
        "Live vietato: la strategia non è positiva con costi e slittamento aumentati. Solo osservazione e demo.",
    });
  }

  const identifier = input.identifier.trim();
  const apiKey = input.apiKey.trim();
  const password = input.password;
  if (!identifier || !apiKey || !password) {
    return fail({
      code: "missing-fields",
      message: "Compila identificativo, API key e password API.",
    });
  }

  let cst: string | null = null;
  let securityToken: string | null = null;

  try {
    const sessionRes = await capitalRequest(host, "/session", {
      method: "POST",
      apiKey,
      body: {
        identifier,
        password,
        encryptedPassword: false,
      },
    });

    cst = sessionRes.cst;
    securityToken = sessionRes.securityToken;

    if (sessionRes.status >= 400 || !cst || !securityToken) {
      const err = readError(sessionRes.json, sessionRes.status);
      steps.push({
        name: "POST /session",
        ok: false,
        detail: err.code ?? `HTTP ${sessionRes.status}`,
      });
      return fail(err);
    }

    steps.push({
      name: "POST /session",
      ok: true,
      detail: "Sessione aperta. Token non mostrati.",
    });

    const meRes = await capitalRequest(host, "/session", {
      method: "GET",
      cst,
      securityToken,
    });
    if (meRes.status >= 400) {
      const err = readError(meRes.json, meRes.status);
      steps.push({
        name: "GET /session",
        ok: false,
        detail: err.code ?? `HTTP ${meRes.status}`,
      });
      return fail(err);
    }
    const me = asRecord(meRes.json);
    steps.push({
      name: "GET /session",
      ok: true,
      detail: "Dettagli sessione letti.",
    });

    const accountsRes = await capitalRequest(host, "/accounts", {
      method: "GET",
      cst,
      securityToken,
    });
    if (accountsRes.status >= 400) {
      const err = readError(accountsRes.json, accountsRes.status);
      steps.push({
        name: "GET /accounts",
        ok: false,
        detail: err.code ?? `HTTP ${accountsRes.status}`,
      });
      return fail(err);
    }
    const accounts = parseAccounts(accountsRes.json);
    steps.push({
      name: "GET /accounts",
      ok: true,
      detail:
        accounts.length === 1
          ? "1 conto letto."
          : `${accounts.length} conti letti.`,
    });

    return {
      ok: true,
      environment,
      host,
      latencyMs: Date.now() - started,
      steps,
      accounts,
      session: {
        clientId: me ? asString(me.clientId) : null,
        accountId: me ? asString(me.currentAccountId) ?? asString(me.accountId) : null,
        locale: me ? asString(me.locale) : null,
        timezoneOffset: me ? asNumber(me.timezoneOffset) : null,
      },
      error: null,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return fail({
      code: aborted ? "timeout" : "network",
      message: aborted
        ? "Timeout verso Capital.com (15s)."
        : "Impossibile raggiungere l'API Capital.com.",
    });
  } finally {
    if (cst && securityToken) {
      try {
        await capitalRequest(host, "/session", {
          method: "DELETE",
          cst,
          securityToken,
        });
        steps.push({
          name: "DELETE /session",
          ok: true,
          detail: "Sessione chiusa subito dopo il test.",
        });
      } catch {
        steps.push({
          name: "DELETE /session",
          ok: false,
          detail: "Chiusura sessione non confermata.",
        });
      }
    }
  }
}
