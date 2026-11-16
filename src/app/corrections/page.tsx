import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Corrections Policy" };

export default function CorrectionsPage() {
  return (
    <LegalPage title="Corrections Policy" updated="November 14, 2026">
      <p>
        We take factual accuracy seriously, even when our tone is not
        serious. If something on Nauseated Face is wrong, we want to know.
      </p>

      <h2>How to request a correction</h2>
      <p>
        Use the{" "}
        <Link href="/contact" className="font-medium text-nausea underline underline-offset-2">
          Contact / Right to Respond
        </Link>{" "}
        page. Include the business name, the page URL, and what you believe
        is inaccurate. If you are a business owner or operator disputing an
        inspection record itself, we will point you to the official King
        County record and process, since we do not control or alter
        underlying inspection data.
      </p>

      <h2>What we will do</h2>
      <ul>
        <li>Review the request against the official King County source record.</li>
        <li>Correct any error in how we transcribed, grouped, or displayed the data.</li>
        <li>Clearly mark corrected or superseded records rather than silently editing them.</li>
        <li>Preserve original data values and timestamps for auditability.</li>
      </ul>

      <h2>What we will not do</h2>
      <ul>
        <li>Remove or suppress an accurate record in exchange for payment.</li>
        <li>Improve a ranking in exchange for payment.</li>
        <li>Alter the underlying government inspection data itself.</li>
      </ul>
    </LegalPage>
  );
}
