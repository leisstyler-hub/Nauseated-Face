export default function AdminLoading() {
  return <section aria-busy="true" aria-label="Loading admin page" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
    <p role="status" className="text-sm text-muted">Loading admin page…</p>
  </section>;
}
