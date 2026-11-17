import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="November 14, 2026">
      <h2>Use of the site</h2>
      <p>
        Nauseated Face is provided for general informational and editorial
        purposes. You may read, share, and link to our content. You may not
        scrape, republish, or redistribute our presentation and commentary at
        scale without permission. Underlying government inspection records
        remain available from their official publishers under the applicable
        source terms linked on our sources and coverage page.
      </p>

      <h2>No warranty</h2>
      <p>
        Content is provided &quot;as is.&quot; We make reasonable efforts to
        accurately reflect the responsible health authorities&apos; inspection data, but we
        do not guarantee completeness, accuracy, or timeliness, and we are
        not liable for decisions made based on this site. A record on this
        site is a record of an inspection, not a current determination of
        food safety.
      </p>

      <h2>Editorial content</h2>
      <p>
        Headlines and commentary on Nauseated Face use humor, sarcasm, and
        dramatic framing. Factual claims about specific inspections are
        sourced from official records and are distinguished from commentary.
        We do not knowingly publish false statements of fact.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms as the site evolves. Continued use after an
        update means you accept the revised terms.
      </p>
    </LegalPage>
  );
}
