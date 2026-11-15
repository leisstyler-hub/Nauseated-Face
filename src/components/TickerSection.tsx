import { getHomeArea } from "@/lib/home-area";
import { connection } from "next/server";
import { getInspectionFeed } from "@/lib/kingcounty";
import { InspectionTicker } from "./InspectionTicker";
import { CityPromptTicker } from "./CityPromptTicker";
export async function TickerSection() {
  await connection();
  const area = await getHomeArea();
  if (!area.selected) return <CityPromptTicker/>;
  if (area.jurisdictionId !== "wa-king") return <div className="ticker px-4 py-3 text-xs text-muted">{area.label}: official inspection records below. Availability depends on the selected source.</div>;
  let events;
  try {
    events = (await getInspectionFeed()).events;
  } catch {
    events = null;
  }
  return events ? (
    <InspectionTicker events={events} />
  ) : (
    <div className="ticker px-4 py-3 text-xs text-muted">
      Inspection ticker unavailable. Inspection records could not be loaded.
    </div>
  );
}
