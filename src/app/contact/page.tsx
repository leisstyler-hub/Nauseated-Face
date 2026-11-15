import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Contact / Right to Respond" };

export default function ContactPage() {
  return (
    <LegalPage title="Contact / Right to Respond" updated="November 14, 2026">
      <p>
        If you are a business featured on Nauseated Face and want to respond
        to an inspection record, dispute how we presented it, or request a
        correction, we want to hear from you.
      </p>

      <h2>This channel isn&apos;t connected yet</h2>
      <p>
        A monitored contact address and/or form have not been set up yet, so
        we are not displaying one rather than show a contact method nobody is
        reading. Check back soon.
      </p>

      <h2>What to include when it&apos;s live</h2>
      <ul>
        <li>Business name and the page URL in question</li>
        <li>What you believe is inaccurate or unfair</li>
        <li>Any official documentation supporting a correction (e.g., a passed reinspection)</li>
      </ul>

      <p>
        See our{" "}
        <Link href="/corrections" className="font-medium text-nausea underline underline-offset-2">
          Corrections Policy
        </Link>{" "}
        for how requests are handled.
      </p>
    </LegalPage>
  );
}
