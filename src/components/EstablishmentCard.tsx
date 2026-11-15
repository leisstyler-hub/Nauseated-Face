import {OfficialResultBadge} from "./OfficialResultBadge";
import Link from "next/link";
import type { Establishment } from "@/lib/locations";
import { formatInspectionDate, titleCase } from "@/lib/format";


export function EstablishmentCard({ establishment, stateSlug }: { establishment: Establishment; stateSlug: string }) {
  const e = establishment;
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-card-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold leading-snug">
            <Link href={`/restaurants/${stateSlug}/${e.slug}`} className="transition-colors hover:text-nausea">
              {titleCase(e.name)}
            </Link>
          </h3>
          <p className="text-sm text-muted">
            {[e.address && titleCase(e.address), e.city && titleCase(e.city), e.stateCode].filter(Boolean).join(", ")} {e.zip ?? ""}
          </p>
        </div>
        <OfficialResultBadge result={e.latestResult}/>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        {e.latestInspectionDate && <span>Latest inspection {formatInspectionDate(e.latestInspectionDate)}</span>}
        {e.latestScore !== null && <span>Official score as published: {e.latestScore}</span>}
        <span>
          {e.inspectionCount} saved inspection{e.inspectionCount === 1 ? "" : "s"}
        </span>
      </div>
      <Link href={`/restaurants/${stateSlug}/${e.slug}`} className="mt-1 text-xs font-semibold text-nausea underline underline-offset-2">
        View inspection history
      </Link>
    </article>
  );
}
