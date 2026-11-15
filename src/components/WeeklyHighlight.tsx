import { Face } from "@/components/Face";
import type { InspectionEvent } from "@/lib/kingcounty";
import Link from "next/link";
import { inspectionPath } from "../../backend/inspection-detail.mjs";
import { formatInspectionDate, titleCase } from "@/lib/format";
import { concernPercent } from "@/lib/ranking";
export function WeeklyHighlight({
  event,
  scope,
}: {
  event: InspectionEvent | null;
  scope: string;
}) {
  return (
    <section id="worst" className="weekly">
      <div className="section-heading">
        <p className="eyebrow text-nausea">
          THE HEADLINE WE WISH WE DIDN&apos;T HAVE
        </p>
        <h2>This Week&apos;s Worst</h2>
        <p className="text-muted">
          The inspections that made us lose our appetite.
        </p>
      </div>
      <p className="credibility">
        Featured based on the highest violation-point total among recent King
        County inspections. Rankings are driven by public records, not personal
        opinions.
      </p>
      <p className="scope">{scope}</p>
      {!event ? (
        <p className="empty-state">
          No qualifying inspection in this sample. One minor violation does not
          earn this spot.
        </p>
      ) : (
        <article className="featured-card">
          <div className="featured-top">
            <span className="worst-badge"><Face /> THIS WEEK&apos;S WORST</span>
            <time>{formatInspectionDate(event.inspectionDate)}</time>
          </div>
          <div className="featured-title">
            <div>
              <h3>{event.profileHref ? <Link href={event.profileHref} className="transition-colors hover:text-nausea underline decoration-nausea/40 underline-offset-4">{titleCase(event.name)}</Link> : titleCase(event.name)}</h3>
              <p className="text-muted">
                {titleCase(event.address)}, {titleCase(event.city)}
              </p>
            </div>
            <div className="face-rating">
              <span aria-hidden><Face /></span>
              <strong>{concernPercent(event)}%</strong>
              <small>Nauseated Face Index v1</small>
            </div>
          </div>
          <div className="score-grid">
            <div>
              <strong className="text-critical">
                {event.totalViolationPoints}
              </strong>
              <span>Violation points</span>
            </div>
            <div>
              <strong>{event.violationCount}</strong>
              <span>Violations</span>
            </div>
            <div>
              <strong className="text-critical">
                {event.redViolationCount}
              </strong>
              <span>Red violations</span>
            </div>
          </div>
          <div className="result-row">
            <div>
              <strong>Inspection result</strong>
              <p>{event.inspectionType}</p>
            </div>
            <span
              className={
                event.result?.toLowerCase() === "unsatisfactory"
                  ? "result-badge serious"
                  : "result-badge"
              }
            >
              {event.result ?? "Not recorded"}
            </span>
          </div>
          <p className="scope">
            Closure recorded at inspection:{" "}
            {event.closedBusiness ? "Yes" : "No"}. This is historical inspection
            data.
          </p>
          <div className="flagged">
            <h4>What inspectors flagged</h4>
            <ul>
              {event.violations.slice(0, 3).map((v, i) => (
                <li key={i}>
                  <span
                    className={
                      v.type === "RED" ? "text-critical" : "text-warning"
                    }
                  >
                    {v.type ?? "Unclassified"} · {v.points} pts
                  </span>
                  <p>{v.description}</p>
                </li>
              ))}
            </ul>
            {event.violationCount > 3 && (
              <p className="text-sm text-nausea">
                + {event.violationCount - 3} additional recorded violations
              </p>
            )}
          </div>
          <Link
            className="inspection-button"
            href={inspectionPath(event)}
          >
            Explore the full inspection <span aria-hidden>→</span>
          </Link>
          <p className="scope">
            An inspection record, not a current determination of safety. Index =
            violation points capped at 100; not a probability of illness.{" "}
            <Link href="/methodology">How it works</Link>.
          </p>
        </article>
      )}
    </section>
  );
}
