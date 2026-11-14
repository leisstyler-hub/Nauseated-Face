import { connection } from "next/server";
import { getRecentInspectionEvents } from "@/lib/kingcounty";
import { InspectionTicker } from "./InspectionTicker";
export async function TickerSection() {
  await connection();
  let events;
  try {
    events = await getRecentInspectionEvents();
  } catch {
    events = null;
  }
  return events ? (
    <InspectionTicker events={events} />
  ) : (
    <div className="ticker px-4 py-3 text-xs text-muted">
      Inspection ticker unavailable. King County source could not be reached.
    </div>
  );
}
