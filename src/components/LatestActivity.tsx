import { Fragment } from "react";
import { InspectionEvent } from "@/lib/kingcounty";
import { InspectionCard } from "./InspectionCard";
import { AdSlot } from "./AdSlot";

export function LatestActivity({ events }: { events: InspectionEvent[] }) {
  return (
    <section id="latest" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Latest Inspection Activity
        </h2>
        <span className="text-xs font-semibold text-muted">
          {events.length} recent inspections from King County
        </span>
      </div>
      {events.length === 0 ? (
        <p className="rounded-xl border border-card-border bg-card p-6 text-sm text-muted">
          The King County API didn&apos;t return any records just now. Try
          refreshing — this section always reflects live data, never
          placeholders.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <Fragment key={event.serialNum}>
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
    </section>
  );
}
