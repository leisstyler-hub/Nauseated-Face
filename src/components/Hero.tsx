export function Hero() {
  return (
    <section className="border-b border-card-border bg-gradient-to-b from-nausea-soft to-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6 sm:py-24">
        <span className="text-6xl sm:text-8xl" aria-hidden>
          🤢
        </span>
        <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Seattle&apos;s Food-Safety Watchdog,{" "}
          <span className="text-nausea">With a Sense of Humor</span>
        </h1>
        <p className="max-w-2xl text-balance text-base text-muted sm:text-lg">
          Nauseated Face turns official King County food inspection records
          into readable rankings and stories — funny, sarcastic, dramatic,
          and always data-backed. Never a knowing falsehood.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href="#latest"
            className="rounded-full bg-nausea px-6 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90"
          >
            See Latest Inspections
          </a>
          <a
            href="/methodology"
            className="rounded-full border border-card-border px-6 py-3 text-sm font-bold text-foreground transition-colors hover:border-nausea"
          >
            How Scoring Works
          </a>
        </div>
        <p className="pt-4 text-xs text-muted">
          Independent publication, not affiliated with King County.
        </p>
      </div>
    </section>
  );
}
