import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 14, 2026">
      <h2>What we collect today</h2>
      <p>
        As of this writing, Nauseated Face does not have an account system,
        newsletter signup, or analytics provider connected. If and when we
        add any of these, this page will be updated first to describe
        exactly what is collected and why, before the feature goes live.
      </p>

      <h2>Optional location sharing</h2>
      <p>
        If you tap Use my location, your browser asks permission to provide your
        location. Coordinates are used only in your browser to suggest cities
        near imported inspection records. We do not send these coordinates to
        our server or save them. Choosing a city saves that city in your
        browser&apos;s local storage so it can be remembered on future visits.
        You can always select a city manually without sharing your location.
      </p>

      <h2>Business and inspection data</h2>
      <p>
        Inspection records shown on this site concern businesses, not
        individuals, and come from the public King County Food Establishment
        Inspection Data dataset. We do not publish employee names or
        customer information.
      </p>

      <h2>Future changes</h2>
      <p>
        If we add analytics, a newsletter, or advertising, those systems will
        be described here, including what data is collected, how it is used,
        and how to opt out where applicable.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent through the{" "}
        <Link href="/contact" className="font-medium text-nausea underline underline-offset-2">
          Contact
        </Link>{" "}
        page.
      </p>
    </LegalPage>
  );
}
