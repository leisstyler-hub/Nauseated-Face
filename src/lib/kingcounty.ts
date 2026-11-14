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
    const key = row.inspection_serial_num;
    if (!key) continue;
    const existing = bySerial.get(key);
    if (existing) existing.push(row);
    else bySerial.set(key, [row]);
  }

  const events: InspectionEvent[] = [];
  for (const [serialNum, group] of bySerial) {
    const first = group[0];
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
      closedBusiness: first.inspection_closed_business === "Yes",
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
      new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime(),
  );
}

export async function fetchRecentInspectionEvents(
  rowLimit = 500,
): Promise<InspectionEvent[]> {
  const url = `${SOURCE_API}?$limit=${rowLimit}&$order=inspection_date DESC`;
  const res = await fetch(url, {
    next: { revalidate: 900 },
  });
  if (!res.ok) {
    throw new Error(`King County API request failed: ${res.status}`);
  }
  const rows: ViolationRow[] = await res.json();
  return groupIntoEvents(rows);
}
