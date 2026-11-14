import { badFirst, eligibleForWorst } from "@/lib/ranking";
import { connection } from "next/server";
import { getRecentInspectionEvents } from "@/lib/kingcounty";
import { formatRefreshedAt } from "@/lib/format";
import { WeeklyHighlight } from "./WeeklyHighlight";
import { LatestActivity } from "./LatestActivity";

export async function InspectionFeedSection() {
  await connection();
  const refreshedAt = new Date();

  let events: Awaited<ReturnType<typeof getRecentInspectionEvents>> = [];
  let fetchFailed = false;

  try {
    events = await getRecentInspectionEvents();
  } catch {
    fetchFailed = true;
  }

  if (fetchFailed) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="rounded-xl border border-critical/30 bg-critical-soft p-6 text-sm text-critical">
          Couldn&apos;t reach the King County inspection API just now. This
          section will populate automatically once the source is reachable again
          — nothing here is placeholder data.
        </p>
      </section>
    );
  }

  const cutoff = refreshedAt.getTime() - 7 * 86400000;
  const recent = events.filter(
    (e) => new Date(e.inspectionDate).getTime() >= cutoff,
  );
  const weekly = recent.filter(eligibleForWorst).sort(badFirst)[0] ?? null;
  const ordered = [...events].sort(badFirst);
  const highest = ordered.slice(0, 4);
  const remaining = ordered.slice(4);
  const latest = [...highest, ...remaining.slice(-8)];
  const scope = `Past 7 days; ${recent.length} inspections in a sample of the latest ${events.length} inspection events. This is not a countywide ranking.`;

  return (
    <>
      <p className="mx-auto max-w-6xl px-4 pt-6 text-right text-xs text-muted sm:px-6">
        Latest available King County data — page retrieved{" "}
        {formatRefreshedAt(refreshedAt)}
      </p>
      <WeeklyHighlight event={weekly} scope={scope} />
      <LatestActivity events={latest} />
    </>
  );
}
