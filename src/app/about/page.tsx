import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SOURCE_DATASET_URL } from "@/lib/kingcounty";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <LegalPage title="About Nauseated Face" updated="November 14, 2026">
      <p>
        Nauseated Face is an independent publication that turns official King
        County food establishment inspection records into readable rankings
        and stories. The goal is simple: make public health inspection data
        — which is already public and already free — easier to find, easier
        to understand, and more interesting to actually read.
      </p>

      <h2>What we are</h2>
      <p>
        A small, data-driven project covering restaurant and food business
        inspections across Seattle and King County, built on top of the{" "}
        <a
          href={SOURCE_DATASET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-nausea underline underline-offset-2"
        >
          King County Food Establishment Inspection Data
        </a>{" "}
        dataset.
      </p>

      <h2>What we are not</h2>
      <ul>
        <li>We are not King County, King County Public Health, or any government agency.</li>
        <li>We do not conduct inspections — we read and present inspection records that already exist.</li>
        <li>We are not a food safety certification, rating, or regulatory body.</li>
        <li>We are not affiliated with Hugging Face, despite the overlapping emoji.</li>
      </ul>

      <h2>Our standard</h2>
      <p>
        We write with humor and attitude, but every factual claim traces back
        to an official inspection record. We never claim a restaurant caused
        illness unless an official agency confirms it, and we never publish
        unsupported accusations, rumors, employee names, or customer
        information. See our{" "}
        <a href="/methodology" className="font-medium text-nausea underline underline-offset-2">
          Data Methodology
        </a>{" "}
        and{" "}
        <a href="/corrections" className="font-medium text-nausea underline underline-offset-2">
          Corrections Policy
        </a>{" "}
        for specifics.
      </p>
    </LegalPage>
  );
}
