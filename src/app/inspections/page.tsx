import Link from "next/link";
import { getInspectionFeed } from "@/lib/kingcounty";
import { InspectionCard } from "@/components/InspectionCard";

export const metadata = { title: 'Recent inspections' };

export default async function InspectionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams;
  let feed;
  try { feed = await getInspectionFeed(); }
  catch { return <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6"><h1 className="text-3xl font-extrabold">Records temporarily unavailable</h1><p className="my-5 text-muted">We could not load inspection results. Please try again shortly.</p><Link href="/" className="text-nausea underline">Back to home</Link></section>; }
  const events = [...feed.events].sort((a, b) => b.inspectionDate.localeCompare(a.inspectionDate) || a.businessId.localeCompare(b.businessId) || a.serialNum.localeCompare(b.serialNum));
  const pages = Math.max(1, Math.ceil(events.length / 12));
  const requested = Number(query.page);
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, pages) : 1;
  const items = events.slice((page - 1) * 12, page * 12);
  return <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
    <Link href="/#latest" className="text-sm text-nausea underline underline-offset-4">Back to home</Link>
    <p className="mt-8 text-xs font-bold tracking-widest text-nausea">MORE RECORDS. THE FULL PICTURE.</p>
    <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">Recent inspections</h1>
    <p className="my-5 max-w-2xl text-sm leading-relaxed text-muted">Newest inspections first. Open a card to see every recorded violation and the original source. {feed.saved ? 'This is a limited saved sample, with the newest saved inspection per business.' : 'This view covers the latest 100 inspection events from King County, cached for up to 15 minutes; a business can have separate inspections.'} This is not a complete county history or a current safety rating.</p>
    {feed.saved && (feed.stale || feed.importError) && <p className="mb-5 text-sm text-warning">Showing saved records. {feed.importError ? 'The last import attempt failed.' : 'Some records need refreshing.'}</p>}
    <p className="mb-5 text-xs text-muted">{items.length ? `${(page - 1) * 12 + 1}–${Math.min(page * 12, events.length)} of ${events.length} inspections` : 'No inspections available'}</p>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(event => <InspectionCard key={`${event.businessId}:${event.serialNum}:${event.inspectionDate}`} event={event} />)}</div>
    <nav aria-label="Results pages" className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm">
      {page > 1 ? <Link href={`/inspections?page=${page - 1}`} className="rounded-full border border-card-border px-5 py-3 text-nausea">Previous</Link> : <span />}
      <span className="text-muted">Page {page} of {pages}</span>
      {page < pages ? <Link href={`/inspections?page=${page + 1}`} className="rounded-full bg-nausea px-5 py-3 font-bold text-background">Next results</Link> : <span />}
    </nav>
  </section>;
}
