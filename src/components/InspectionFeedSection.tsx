import { getHomeArea } from "@/lib/home-area";
import { getCityEstablishments } from "@/lib/locations";
import { EstablishmentCard } from "./EstablishmentCard";
import { badFirst, eligibleForWorst } from "@/lib/ranking";
import { connection } from "next/server";
import { getInspectionFeed } from "@/lib/kingcounty";
import { formatInspectionDate } from "@/lib/format";
import { formatRefreshedAt } from "@/lib/format";
import { WeeklyHighlight } from "./WeeklyHighlight";
import { LatestActivity } from "./LatestActivity";

export async function InspectionFeedSection() {
  await connection();
  const refreshedAt = new Date();
  const area = await getHomeArea();
  if (area.jurisdictionId !== "wa-king") {
    const records = area.covered ? await getCityEstablishments(area.stateCode,area.city,12) : [];
    return <section id="latest" className="mx-auto max-w-6xl px-4 py-14 sm:px-6"><p className="eyebrow text-nausea">{area.label}</p><h2 className="mt-3 text-3xl font-extrabold">Latest inspection records</h2><p className="my-5 text-sm text-muted">{area.description} Official results are shown as published; King County rankings do not apply here.</p>{records.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{records.map(e=><EstablishmentCard key={e.id} establishment={e} stateSlug={area.stateSlug}/>)}</div> : <p className="empty-state">No published records are available for this location yet. Choose another location.</p>}</section>;
  }

  let events: Awaited<ReturnType<typeof getInspectionFeed>>["events"] = [];
  let feed: Awaited<ReturnType<typeof getInspectionFeed>> | null = null;
  let fetchFailed = false;

  try {
    feed = await getInspectionFeed();
    events = feed.events;
  } catch {
    fetchFailed = true;
  }

  if (fetchFailed) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="rounded-xl border border-critical/30 bg-critical-soft p-6 text-sm text-critical">
          Inspection records are temporarily unavailable. Please try again later
          or consult the official King County source.
        </p>
      </section>
    );
  }

  const cutoff = refreshedAt.getTime() - 7 * 86400000;
  const recent = (feed?.weeklyEvents ?? events).filter(
    (e) => new Date(e.inspectionDate).getTime() >= cutoff,
  );
  const weekly = recent.filter(eligibleForWorst).sort(badFirst)[0] ?? null;
  const ordered = [...events].sort(badFirst);
  const highest = ordered.slice(0, 4);
  const remaining = ordered.slice(4);
  const latest = [...highest, ...remaining.slice(-8)];
  const scope = `${area.label}. Past 7 days; ${recent.length} inspections in ${events.length} businesses with recent records. Rankings use saved official records for this selected area; not a statement of current safety.`;

  return (
    <>
      <p className="mx-auto max-w-6xl px-4 pt-6 text-right text-xs text-muted sm:px-6">
        {feed?.saved
          ? `${area.label}: saved King County records — last refreshed ${feed.observedAt ? formatRefreshedAt(new Date(feed.observedAt)) : 'not yet available'}. ${feed.stale ? 'Some records need refreshing.' : ''} ${feed.importError ? 'Last import attempt failed; showing the last saved records.' : ''} ${area.description}`
          : `${area.label}: King County data — page retrieved ${formatRefreshedAt(refreshedAt)}`}
      </p>
      {feed?.coverage && <p className="mx-auto max-w-6xl px-4 pt-3 text-sm leading-7 text-muted sm:px-6">{area.label}: <strong className="text-foreground">{feed.coverage.inspections.toLocaleString('en-US')} saved inspections</strong> across {feed.coverage.businesses.toLocaleString('en-US')} businesses{feed.coverage.first && feed.coverage.last ? `, ${formatInspectionDate(feed.coverage.first)} to ${formatInspectionDate(feed.coverage.last)}` : ''}. The homepage shows recent records; search and business profiles include saved history. Published source records may not include every inspection ever performed.</p>}
      <WeeklyHighlight event={weekly} scope={scope} />
      <LatestActivity events={latest} saved={Boolean(feed?.saved)} />
    </>
  );
}
