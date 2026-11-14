import { InspectionEvent } from "@/lib/kingcounty";
import { InspectionCard } from "./InspectionCard";

export function WeeklyHighlight({ event }: { event: InspectionEvent | null }) {
  if (!event) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          🤢
        </span>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          The Weekly 🤢
        </h2>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        The most notable recent inspection in the current King County data —
        chosen by total violation points among recent records, not editorial
        opinion.
      </p>
      <InspectionCard event={event} />
    </section>
  );
}
