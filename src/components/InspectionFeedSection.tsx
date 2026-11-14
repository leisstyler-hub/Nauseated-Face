import { connection } from "next/server";
import { fetchRecentInspectionEvents } from "@/lib/kingcounty";
import { formatRefreshedAt } from "@/lib/format";
import { WeeklyHighlight } from "./WeeklyHighlight";
import { LatestActivity } from "./LatestActivity";

export async function InspectionFeedSection() {
  await connection();
  const refreshedAt = new Date();

  let events: Awaited<ReturnType<typeof fetchRecentInspectionEvents>> = [];
  let fetchFailed = false;

  try {
    events = await fetchRecentInspectionEvents(500);
  } catch {
    fetchFailed = true;
  }

  if (fetchFailed) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="rounded-xl border border-critical/30 bg-critical-soft p-6 text-sm text-critical">
          Couldn&apos;t reach the King County inspection API just now. This
          section will populate automatically once the source is reachable
          again — nothing here is placeholder data.
        </p>
      </section>
    );
  }

  const weekly = events.length
    ? [...events].sort(
        (a, b) => b.totalViolationPoints - a.totalViolationPoints,
      )[0]
    : null;
  const latest = events.slice(0, 9);

  return (
    <>
      <p className="mx-auto max-w-6xl px-4 pt-6 text-right text-xs text-muted sm:px-6">
        Latest available King County data — refreshed{" "}
        {formatRefreshedAt(refreshedAt)}
      </p>
      <WeeklyHighlight event={weekly} />
      <LatestActivity events={latest} />
    </>
  );
}
