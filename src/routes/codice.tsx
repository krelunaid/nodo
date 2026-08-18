import { createFileRoute } from "@tanstack/react-router";

const FILES = [
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "startup.sh",
  "src/styles.css",
  "src/router.tsx",
  "src/routes/__root.tsx",
  "src/routes/index.tsx",
  "src/routes/login.tsx",
  "src/routes/api/auth/$.ts",
  "src/lib/trading/analysis.ts",
  "src/lib/trading/indicators.ts",
  "src/lib/trading/risk.ts",
  "src/lib/trading/store.ts",
  "src/lib/trading/types.ts",
  "src/lib/trading/instruments.ts",
  "src/lib/trading/session.ts",
  "src/lib/trading/candles.ts",
  "src/lib/trading/functions.ts",
  "src/lib/trading/market.server.ts",
  "src/lib/trading/scan.ts",
  "src/lib/trading/duration.ts",
  "src/lib/trading/study.server.ts",
  "src/lib/capital/client.server.ts",
  "src/lib/capital/functions.ts",
  "src/lib/capital/types.ts",
  "src/components/desk/trading-desk.tsx",
  "src/components/desk/ticket.tsx",
  "src/components/desk/factor-board.tsx",
  "src/components/desk/broker-switch.tsx",
  "src/components/desk/price-chart.tsx",
  "src/components/desk/book.tsx",
  "src/components/desk/rules.tsx",
  "src/components/desk/scanner.tsx",
  "src/components/desk/duration-study.tsx",
  "src/components/desk/auth-slot.tsx",
];

export const Route = createFileRoute("/codice")({ component: CodicePage });

function CodicePage() {
  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-fg">
      <div className="mx-auto max-w-2xl">
        <p className="text-[11px] font-medium tracking-[0.16em] text-subtle uppercase">
          Solo codice
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-balance">
          I file scritti, non l’app avviata
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-pretty text-muted">
          Qui c’è il sorgente in una cartella. Apri il testo unico, oppure un
          file alla volta. Tasto destro → “Salva con nome” se il download dello
          zip non parte.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <a
            href="/codice/TUTTO-IL-CODICE.txt"
            download="TUTTO-IL-CODICE.txt"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-accent px-4 text-sm font-medium text-accent-fg"
          >
            Un unico file di testo
          </a>
          <a
            href="/desk-codice.zip"
            download="desk-codice.zip"
            className="inline-flex h-11 items-center justify-center rounded-sm border border-border bg-elevated px-4 text-sm font-medium"
          >
            Cartella zip
          </a>
          <a
            href="/"
            className="inline-flex h-11 items-center justify-center px-4 text-sm text-muted hover:text-fg"
          >
            Torna al desk
          </a>
        </div>

        <ol className="mt-8 space-y-1 border-t border-border pt-4 font-mono text-[13px]">
          {FILES.map((file) => (
            <li key={file}>
              <a
                href={`/codice/${file}`}
                download={file.split("/").pop()}
                className="text-muted hover:text-fg"
              >
                {file}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
