import { cache } from "react";
import { createHash } from "node:crypto";
import { readOfficialInspection } from "../../backend/inspection-detail.mjs";
import { openSiteStore, savedStorageEnabled } from "../../backend/production.mjs";
import { loadSavedFeed } from "../../backend/site-feed.mjs";
// King County Food Establishment Inspection Data — official public source.
// https://data.kingcounty.gov/resource/r878-4sxa.json
const SOURCE_API = "https://data.kingcounty.gov/resource/r878-4sxa.json";
export const SOURCE_DATASET_URL =
  "https://data.kingcounty.gov/Health/Food-Establishment-Inspection-Data/f29f-zza5";

export interface ViolationRow {
  name: string;
  inspection_date: string;
  classification?: string;
  address: string;
  city: string;
  zip_code?: string;
  inspection_type: string;
  inspection_score?: string;
  inspection_result?: string;
  inspection_closed_business?: string;
  violation_type?: string;
  violation_description?: string;
  violation_points?: string;
  grade?: string;
  business_id: string;
  inspection_serial_num: string;
}

export interface InspectionEvent {
  profileHref?: string;
  serialNum: string;
  businessId: string;
  name: string;
  address: string;
  city: string;
  zipCode?: string;
  inspectionDate: string;
  inspectionType: string;
  score: number | null;
  result: string | null;
  closedBusiness: boolean;
  grade?: string;
  violations: {
    type: "RED" | "BLUE" | null;
    description: string;
    points: number;
  }[];
  totalViolationPoints: number;
  redViolationCount: number;
  violationCount: number;
  sourceUrl: string;
}

function groupIntoEvents(rows: ViolationRow[]): InspectionEvent[] {
  const bySerial = new Map<string, ViolationRow[]>();
  for (const row of rows) {
    const key = `${row.business_id}|${row.inspection_serial_num}|${row.inspection_date}`;
    if (!row.inspection_serial_num || !row.business_id) continue;
    const existing = bySerial.get(key);
    if (existing) existing.push(row);
    else bySerial.set(key, [row]);
  }

  const events: InspectionEvent[] = [];
  for (const [, group] of bySerial) {
    const first = group[0];
    const serialNum = first.inspection_serial_num;
    const violations = group
      .filter((r) => r.violation_description)
      .map((r) => ({
        type: (r.violation_type as "RED" | "BLUE") ?? null,
        description: r.violation_description!,
        points: Number(r.violation_points ?? 0) || 0,
      }));

    events.push({
      serialNum,
      businessId: first.business_id,
      name: first.name,
      address: first.address,
      city: first.city,
      zipCode: first.zip_code,
      inspectionDate: first.inspection_date,
      inspectionType: first.inspection_type,
      score: first.inspection_score ? Number(first.inspection_score) : null,
      result: first.inspection_result ?? null,
      closedBusiness:
        first.inspection_closed_business?.toLowerCase() === "true" ||
        first.inspection_closed_business?.toLowerCase() === "yes",
      grade: first.grade,
      violations,
      totalViolationPoints: violations.reduce((sum, v) => sum + v.points, 0),
      redViolationCount: violations.filter((v) => v.type === "RED").length,
      violationCount: violations.length,
      sourceUrl: `https://data.kingcounty.gov/resource/r878-4sxa.json?inspection_serial_num=${encodeURIComponent(serialNum)}`,
    });
  }

  return events.sort(
    (a, b) =>
      new Date(b.inspectionDate).getTime() -
      new Date(a.inspectionDate).getTime(),
  );
}

export async function fetchRecentInspectionEvents(
  eventLimit = 100,
): Promise<InspectionEvent[]> {
  const read = async (
    params: Record<string, string>,
  ): Promise<ViolationRow[]> => {
    const res = await fetch(`${SOURCE_API}?${new URLSearchParams(params)}`, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok)
      throw new Error(`King County API request failed: ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error("Invalid King County response");
    return rows;
  };
  // Select event keys first, then fetch every violation row for those keys.
  // A raw row limit would silently split the final inspection.
  const keys = await read({
    $select: "business_id,inspection_serial_num,inspection_date",
    $group: "business_id,inspection_serial_num,inspection_date",
    $order: "inspection_date DESC,business_id,inspection_serial_num",
    $limit: String(Math.min(100, Math.max(1, eventLimit))),
  });
  if (!keys.length) return [];
  const literal = (v: string) => `'${v.replaceAll("'", "''")}'`;
  const rows: ViolationRow[] = [];
  // Batches keep query URLs small. Fail visibly rather than show a partial group.
  for (let i = 0; i < keys.length; i += 15) {
    const where = keys
      .slice(i, i + 15)
      .map(
        (k) =>
          `(business_id=${literal(k.business_id)} AND inspection_serial_num=${literal(k.inspection_serial_num)} AND inspection_date=${literal(k.inspection_date)})`,
      )
      .join(" OR ");
    const batch = await read({
      $where: where,
      $limit: "5000",
      $order: "inspection_date DESC,business_id,inspection_serial_num",
    });
    if (batch.length >= 5000)
      throw new Error("Inspection batch exceeded safe row limit");
    rows.push(...batch);
  }
  return groupIntoEvents(rows);
}

export const getRecentInspectionEvents = cache(() =>
  fetchRecentInspectionEvents(100),
);

async function withProfileLinks(store:ReturnType<typeof openSiteStore>,events:InspectionEvent[]):Promise<InspectionEvent[]>{
  const profiles:{officialId:string;slug:string;stateCode:string}[]=await store.businessProfiles('wa-king',[...new Set(events.map(e=>e.businessId))]);
  const paths=new Map<string,string>(profiles.filter(p=>p.stateCode==='WA').map(p=>[p.officialId,`/restaurants/washington/${p.slug}`] as [string,string]));
  return events.map(event=>({...event,profileHref:paths.get(event.businessId)}));
}

export const getInspectionFeed = cache(async () => {
  const { getHomeArea } = await import("./home-area");
  const area = await getHomeArea();
  if (!area.selected) return {events:[] as InspectionEvent[],weeklyEvents:[] as InspectionEvent[],area,coverage:null as {inspections:number;businesses:number;first:string|null;last:string|null}|null,saved:false,observedAt:null as string|null,stale:false,importError:false};
  if (!savedStorageEnabled()) {
    return { events: (await getRecentInspectionEvents()).filter(e => !area.city || e.city.trim().toLowerCase() === area.city.toLowerCase()), weeklyEvents: await getRecentInspectionEvents(), area, coverage: null as {inspections:number;businesses:number;first:string|null;last:string|null}|null, saved: false, observedAt: null as string | null, stale: false, importError: false };
  }
  const store = openSiteStore();
  try {
    const [feed, coverage] = await Promise.all([loadSavedFeed(store,100,area.city,true),store.feedCoverage(area.city)]);
    if (!area.covered || area.jurisdictionId !== 'wa-king') feed.rows = [];
    const weeklyEvents = await withProfileLinks(store,groupIntoEvents(feed.rows as ViolationRow[]));
    const seen = new Set<string>();
    const events = weeklyEvents.filter(event => { if(seen.has(event.businessId)) return false; seen.add(event.businessId); return true; });
    return { events, weeklyEvents, area, coverage, saved: true, observedAt: feed.oldestObservation, stale: feed.stale, importError: Boolean(feed.freshness.error) };
  } finally { await store.close(); }
});

export async function getInspectionDetail(business: string, serial: string, date: string) {
  if (!savedStorageEnabled()) {
    return { event: groupIntoEvents(await readOfficialInspection(business, serial, date))[0] ?? null, saved: false, observedAt: null as string | null };
  }
  const store = openSiteStore();
  try {
    const id = createHash('sha256').update(JSON.stringify([business, serial])).digest('hex');
    const detail = await store.detail(id);
    if (!detail?.active || !detail.completeEvent) return { event: null, saved: true, observedAt: null };
    const events = await withProfileLinks(store,groupIntoEvents(detail.rows as ViolationRow[]));
    return { event: events.find(event => event.businessId === business && event.serialNum === serial && event.inspectionDate === date) ?? null, saved: true, observedAt: detail.observedAt ?? null };
  } finally { await store.close(); }
}
