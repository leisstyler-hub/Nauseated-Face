import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { AnalyticsPreference } from "@/components/AnalyticsPreference";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 14, 2026">
      <h2>What we collect today</h2>
      <p>
        We measure public website traffic using a random first-party browser identifier,
        visit timestamps and broad page categories such as search or inspection.
        The identifier is stored in a secure, HttpOnly cookie that expires after 180 days
        and is renewed when you visit. We do not store IP addresses, query strings,
        precise location or browser fingerprints in these analytics, and do not link
        the identifier to an account. Our hosting provider may keep its own operational logs.
      </p>
      <p>Visits split after 30 minutes of inactivity. We use these records to report daily traffic and the share of recognized browsers that come back. Different devices or cleared cookies may be counted as new visitors. Known bots, automated tests and admin browsers are excluded where detected; detection is not perfect.</p>
      <p>We honor Do Not Track and Global Privacy Control signals for analytics. You can also disable analytics below. This preference is saved in this browser; changing browsers or clearing local storage resets it. Disabling analytics clears your visitor cookie but does not remove previously recorded anonymous statistics.</p>
      <AnalyticsPreference />
      <h2>Administrator accounts</h2>
      <p>Private administrator sign-in uses essential session cookies and stored account details to protect owner-only controls. Public visitor analytics are separate from these accounts. No public signup or newsletter is connected.</p>

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
