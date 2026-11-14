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
        inspection visit with multiple violations is shown as one event with
        a violation list, not duplicate entries.
      </p>

      <h2>Update frequency</h2>
      <p>
        Pages that show live data are labeled &quot;latest available King
        County data&quot; rather than &quot;real-time,&quot; because we only
        update as often as the source dataset itself updates and our own
        refresh cycle allows. We do not claim faster or more current data
        than the source provides.
      </p>

      <h2>The Nauseated Face Index (in development)</h2>
      <p>
        We are building a transparent scoring system — the Nauseated Face
        Index — that will weigh total violation points, violation count, red
        or critical violations, failed/unsatisfactory results, closures,
        reinspection outcomes, repeat violations at the same business, and
        recency. A single minor violation will never, on its own, land a
        business in a &quot;worst of&quot; ranking. Until this ships, ranking
        categories on the site are shown as previews only — nothing is
        ranked yet.
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
        Inspection records are a snapshot of conditions observed on a
        specific date. A record on this site is a record of an inspection,
        not a current determination of food safety.
      </p>
    </LegalPage>
  );
}
