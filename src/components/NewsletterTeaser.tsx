export function NewsletterTeaser() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
      <div className="rounded-xl border border-card-border bg-card p-6 text-center sm:p-10">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
          Weekly inspection roundup, straight to your inbox
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Newsletter signup isn&apos;t connected yet — check back soon.
        </p>
        <button
          type="button"
          disabled
          className="mt-5 cursor-not-allowed rounded-full bg-card-border px-6 py-3 text-sm font-bold text-muted"
        >
          Coming soon
        </button>
      </div>
    </section>
  );
}
