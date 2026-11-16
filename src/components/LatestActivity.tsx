import { Fragment } from "react";
import Link from "next/link";
import { InspectionEvent } from "@/lib/kingcounty";
import { InspectionCard } from "./InspectionCard";
import { AdSlot } from "./AdSlot";

export function LatestActivity({ events, saved = true }: { events: InspectionEvent[]; saved?: boolean }) {
  return (
    <section id="latest" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {saved ? 'Latest saved inspection per business. Worst first.' : 'Recent inspections. Worst first.'}
        </h2>
        <span className="text-xs font-semibold text-muted">
          {events.length} records · highest points first
        </span>
      </div>
      <p className="mb-6 text-sm text-muted">
        {saved && 'Each business appears once, using its newest inspection in this saved sample. '}
        The four highest-point inspections lead, followed by up to eight
        lowest-point inspections from the recent sample. Lower points deserve
        space too. These are inspection snapshots, not current safety ratings.
      </p>
      {events.length === 0 ? (
        <p className="rounded-xl border border-card-border bg-card p-6 text-sm text-muted">
          No inspection records are available in this view yet. See the
          official King County source for inspection information.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <Fragment key={`${event.businessId}:${event.serialNum}`}>
              <InspectionCard event={event} />
              {i === 2 && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <AdSlot kind="in-feed" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      )}
      <Link href="/inspections" className="mt-8 inline-flex rounded-full bg-nausea px-6 py-3 text-sm font-bold text-background">View all recent inspections <span className="ml-2" aria-hidden>→</span></Link>
    </section>
  );
}
