import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <LegalPage title="About Nauseated Face" updated="November 16, 2026">
      <p>
        The food-safety watchdog no one asked for. Real inspections. Real disgusting.
        Nauseated Face is an independent publication that turns official food
        establishment inspection records into readable reports and stories.
        The goal is simple: make public health inspection data
        — which is already public and already free — easier to find, easier
        to understand, and more interesting to actually read.
      </p>

      <h2>What we are</h2>
      <p>
        A food-safety watchdog with a national focus, expanding city by city
        using official health department records. Coverage varies by location;
        a listed city does not mean we have its inspection history. See our{" "}
        <Link href="/coverage" className="font-medium text-nausea underline underline-offset-2">
          sources and coverage
        </Link>{" "}
        for imported records, limitations, and the responsible health authorities.
        Scores stay within each authority&apos;s system rather than becoming a
        misleading national score. Historical findings describe an inspection,
        not a business&apos;s current condition.
      </p>

      <h2>What we are not</h2>
      <ul>
        <li>We are independent of every health department and government agency.</li>
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
        <Link href="/methodology" className="font-medium text-nausea underline underline-offset-2">
          Data Methodology
        </Link>{" "}
        and{" "}
        <Link href="/corrections" className="font-medium text-nausea underline underline-offset-2">
          Corrections Policy
        </Link>{" "}
        for specifics.
      </p>
    </LegalPage>
  );
}
