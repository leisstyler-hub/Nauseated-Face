import Link from "next/link";
import { DataNetwork } from "@/components/DataNetwork";
import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SOURCE_DATASET_URL } from "@/lib/kingcounty";

export const metadata: Metadata = { title: "Data Methodology" };

export default function MethodologyPage() {
  return (
    <LegalPage title="Data Methodology" updated="November 15, 2026">
      <DataNetwork/>
      <h2>Source</h2>
      <p>
        King County inspection data comes directly from the{" "}
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

      <h2>How to read inspection results</h2>
      <p>Official inspection points and results are shown as published by the health department. King County violation points are not a percentage and are not capped at 100; lower points are better. Recorded violation-point totals are the sum of the published violation items and may differ from the official inspection score.</p>
      <p>We do not currently publish a separate Nauseated Face rating. Health departments use different points, grades and result systems, so their numbers are not interchangeable. Dated findings and inspection history provide context, not a prediction of a restaurant’s current condition or a probability of illness.</p>
      <h2>How records are selected</h2>
      <p>
        This Week&apos;s Worst selects the highest violation-point total among
        inspections dated in the past seven days for the selected city or region.
        King County uses the full saved published-source history, not a 100-event import cutoff. An
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

      <h2>Coverage and history dates</h2>
      <p>Each source has its own published history and update schedule. See <Link href="/coverage" className="text-nausea underline">Data Sources &amp; Coverage</Link> for the earliest and latest saved inspection dates, record counts, last successful refresh and partial-source limitations.</p>
      <h2>Limitations</h2>
      <p>
        Inspection records are a snapshot of conditions observed on a specific
        date. A record on this site is a record of an inspection, not a current
        determination of food safety.
      </p>
    </LegalPage>
  );
}
