export function Verdict() {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-panel">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">
        Studio fuori campione · costi extra
      </p>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-pretty">
        2025–26, spread ×1,5 e slittamento. Nessuna classe è verde. Per questo
        il Live è spento.
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <Item k="Forex" v="−447 €" />
        <Item k="Indici" v="−134 €" />
        <Item k="Oro" v="−243 €" />
        <Item k="Crypto" v="−256 €" />
      </dl>
    </section>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-border bg-bg px-3 py-2">
      <dt className="text-subtle">{k}</dt>
      <dd className="mt-0.5 font-mono text-fg">{v}</dd>
    </div>
  );
}
