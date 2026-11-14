import { concernPercent } from "@/lib/ranking";
import Link from "next/link";
import { inspectionPath } from "../../backend/inspection-detail.mjs";
import { InspectionEvent } from "@/lib/kingcounty";
import { formatInspectionDate, titleCase } from "@/lib/format";

function resultBadgeClasses(result: string | null) {
  if (result === "Unsatisfactory")
    return "bg-critical-soft text-critical border-critical/30";
  if (result === "Satisfactory")
    return "bg-nausea-soft text-nausea border-nausea/30";
  return "bg-card border-card-border text-muted";
}

export function InspectionCard({ event }: { event: InspectionEvent }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold leading-snug">
            {titleCase(event.name)}
          </h3>
          <p className="text-sm text-muted">
            {titleCase(event.address)}, {titleCase(event.city)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${resultBadgeClasses(
            event.result,
          )}`}
        >
          {event.result ?? "No result on file"}
        </span>
      </div>

      <p className="text-nausea font-bold">
        🤢 {concernPercent(event)}%{" "}
        <span className="text-xs font-normal text-muted">
          Nauseated Face Index v1
        </span>
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <span>{formatInspectionDate(event.inspectionDate)}</span>
        <span>{event.inspectionType}</span>
        {event.score !== null && <span>Official score: {event.score}</span>}
        <span>
          {event.violationCount} violation
          {event.violationCount === 1 ? "" : "s"}
          {event.redViolationCount > 0 && (
            <span className="text-critical">
              {" "}
              ({event.redViolationCount} red)
            </span>
          )}
        </span>
        {event.closedBusiness && (
          <span className="font-semibold text-critical">
            Closed by inspector
          </span>
        )}
      </div>

      {event.violations.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {event.violations.slice(0, 3).map((v, i) => (
            <li key={i} className="flex gap-2">
              <span
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  v.type === "RED" ? "bg-critical" : "bg-warning"
                }`}
                aria-hidden
              />
              <span className="text-muted">{v.description}</span>
            </li>
          ))}
          {event.violations.length > 3 && (
            <li className="pl-4 text-xs text-muted">
              <Link href={inspectionPath(event)} className="text-nausea underline underline-offset-2">+{event.violations.length - 3} more violation
              {event.violations.length - 3 === 1 ? "" : "s"}</Link>
            </li>
          )}
        </ul>
      )}

      <Link
        href={inspectionPath(event)}
        className="mt-1 text-xs font-semibold text-nausea underline underline-offset-2"
      >
        View full inspection
      </Link>
    </article>
  );
}
