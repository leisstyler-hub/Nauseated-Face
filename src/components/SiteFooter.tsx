import Link from "next/link";
import { SOURCE_DATASET_URL } from "@/lib/kingcounty";

const LEGAL_LINKS = [
  { href: "/about", label: "About" },
  { href: "/methodology", label: "Data Methodology" },
  { href: "/corrections", label: "Corrections Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/contact", label: "Contact / Right to Respond" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-card-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="max-w-3xl text-sm leading-relaxed text-muted">
          Nauseated Face is an independent, satirical food-safety publication.
          It is <strong className="text-foreground">not affiliated with, endorsed by, or operated by</strong>{" "}
          King County, King County Public Health, or any government agency.
          All inspection facts are sourced directly from the{" "}
          <a
            href={SOURCE_DATASET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-nausea underline underline-offset-2"
          >
            official King County Food Establishment Inspection Data
          </a>{" "}
          and are not independently verified beyond that source.
        </p>

        <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="mt-8 text-xs text-muted">
          © 2026 Nauseated Face. Not affiliated with King County or Hugging
          Face.
        </p>
      </div>
    </footer>
  );
}
