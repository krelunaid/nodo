import { Badge } from "@/components/ui/badge";
import type { MarketAnalysis } from "@/lib/trading/analysis";
import { cn } from "@/lib/utils";

export function FactorBoard({ analysis }: { analysis: MarketAnalysis | null }) {
  if (!analysis) {
    return (
      <div className="rounded-lg border border-border bg-elevated p-4 text-sm text-muted">
        Carico la checklist…
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          Quattro domande
        </p>
        <p className="mt-1 text-sm leading-snug text-pretty text-fg">
          {analysis.summary}
        </p>
      </div>

      <div className="grid gap-2">
        {analysis.checks.map((check) => (
          <article
            key={check.id}
            className="rounded-md border border-border bg-bg px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-medium text-fg">{check.question}</h3>
              <span
                className={cn(
                  "text-[11px] font-medium tracking-wide uppercase",
                  check.pass ? "text-ok-fg" : "text-danger-fg",
                )}
              >
                {check.pass ? "Sì" : "No"}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-subtle tabular-nums">
              {check.value}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-pretty text-muted">
              {check.note}
            </p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={analysis.setup.id === "none" ? "default" : "ok"}>
          {analysis.setup.label}
        </Badge>
        <Badge variant={analysis.allowed.long ? "ok" : "default"}>Long</Badge>
        <Badge variant={analysis.allowed.short ? "ok" : "default"}>Short</Badge>
        <Badge variant={analysis.session.open ? "ok" : "warn"}>
          {analysis.session.label}
        </Badge>
      </div>
    </section>
  );
}
