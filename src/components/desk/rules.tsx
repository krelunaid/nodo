export function Rules() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Rule
        kicker="1 · Trend"
        title="EMA veloce sopra la lenta"
        body="Long solo se EMA 20 > EMA 50 (9 > 21 in scalp). Short solo se è il contrario. RSI da solo non compra e non vende."
      />
      <Rule
        kicker="2 · Momentum"
        title="RSI come filtro, non oracolo"
        body="Long con RSI ≥ 50 nel trend rialzista. Short con RSI ≤ 50. In scalp l'RSI sta vicino a 50, non agli estremi."
      />
      <Rule
        kicker="3 · Volume"
        title="Candela più forte della media"
        body="Entra se il volume è almeno 1.2× (1.5× in swing). Senza partecipazione i breakout mentono. ATR filtra i laterali morti."
      />
      <Rule
        kicker="4 · Rischio"
        title="Prima non bruciare"
        body="1% a trade, tetto 2% al giorno, due stop e si ferma. Lo studio walk-forward è in rosso: questi freni limitano il danno, non creano profitto."
      />
    </section>
  );
}

function Rule({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <p className="text-[11px] font-medium tracking-wide text-subtle uppercase">
        {kicker}
      </p>
      <h2 className="mt-2 text-base leading-snug font-medium text-balance">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-pretty text-muted">{body}</p>
    </article>
  );
}
