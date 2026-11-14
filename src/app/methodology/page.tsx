import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SOURCE_DATASET_URL } from "@/lib/kingcounty";

export const metadata: Metadata = { title: "Data Methodology" };

export default function MethodologyPage() {
  return (
    <LegalPage title="Data Methodology" updated="November 14, 2026">
      <h2>Source</h2>
      <p>
        All inspection data comes directly from the{" "}
        <a
          href={SOURCE_DATASET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-nausea underline underline-offset-2"
        >
          King County Food Establishment Inspection Data
        </a>{" "}
        public dataset, published by King County. We do not alter inspection
        facts, scores, or violation descriptions — we only reformat and group
        them for readability.
      </p>

      <h2>How records are grouped</h2>
      <p>
        The raw dataset publishes one row per violation. We group rows into a
        single inspection event by inspection serial number, so a single
        inspection visit with multiple violations is shown as one event with a
        violation list, not duplicate entries.
      </p>

      <h2>Update frequency</h2>
      <p>
        Pages that show live data are labeled &quot;latest available King County
        data&quot; rather than &quot;real-time,&quot; because we only update as
        often as the source dataset itself updates and our own refresh cycle
        allows. We do not claim faster or more current data than the source
        provides.
      </p>

      <h2>Nauseated Face Index v1: 0–100% 🤢</h2>
      <p>
        The current point-based index equals the total recorded violation
        points, rounded and capped between 0 and 100. Higher means more
        violation points at that inspection. It is our editorial scale, not a
        government rating, a percent unsafe, or a probability of illness.
        Official scores remain separate. Red counts, result and closure are
        shown alongside it; history-based weighting is still in development.
      </p>
      <p>
        This Week&apos;s Worst selects the highest violation-point total among
        inspections dated in the past seven days within our sample of the latest
        100 inspection events. It is not an exhaustive countywide ranking. An
        inspection needs at least 20 violation points, an unsatisfactory result,
        or a recorded closure to qualify. Ties use red violation count, then
        inspection date. If none qualifies, we show an empty state. The activity
        feed leads with the four highest-point records, followed by up to eight
        lowest-point records from the remainder of the sample. Each group is
        ordered by points descending, then red count and date.
      </p>
      <p>
        The ticker shows the latest fetched records, not a live stream. Records
        with at least 50 violation points receive extra visual emphasis. The
        source fetch may be cached for up to 15 minutes; page retrieval time is
        not the source publication time.
      </p>

      <h2>What we distinguish</h2>
      <ul>
        <li>A single, one-time inspection result</li>
        <li>An ongoing trend across multiple inspections</li>
        <li>Repeat violations at the same business</li>
        <li>Closure by an inspector</li>
        <li>Reinspection outcomes, including passed reinspections</li>
      </ul>

      <h2>Limitations</h2>
      <p>
        Inspection records are a snapshot of conditions observed on a specific
        date. A record on this site is a record of an inspection, not a current
        determination of food safety.
      </p>
    </LegalPage>
  );
}
