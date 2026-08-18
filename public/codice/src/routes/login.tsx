import { createFileRoute } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-panel">
        <p className="text-[11px] font-medium tracking-[0.16em] text-subtle uppercase">
          Desk
        </p>
        <h1 className="mt-2 text-xl font-medium tracking-tight">Accedi</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          L'accesso è per il desk. Le operazioni restano cartacee: niente ordini
          sul tuo broker.
        </p>
        <div className="mt-5 grid gap-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="secondary"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Continua con {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted">Accesso disattivato.</p>
          )}
        </div>
        <a href="/" className="mt-5 inline-block text-xs text-subtle hover:text-fg">
          Torna al desk
        </a>
      </div>
    </main>
  );
}
