import Link from "next/link";
import { Face } from "@/components/Face";
import { SearchBox } from "@/components/SearchBox";
export function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">
          America&apos;s Irreverent Food-Safety Watchdog.
        </p>
        <h1>
          Someone&apos;s Gotta
          <br />
          Clean This{" "}
          <span className="text-nausea">
            Cr
            <span
              className="inline-face"
              role="img"
              aria-label="nauseated face"
            >
              <Face />
            </span>
            p Up.
          </span>
        </h1>
        <p className="hero-description">
          Nauseated Face turns official food inspection records into readable
          rankings and stories — with a healthy dose of sarcasm, a little
          drama, and facts that always come first. Explore restaurant
          inspections near you.
        </p>
        <div className="my-2">
          <SearchBox />
        </div>
        <div className="hero-actions">
          <a href="#worst" className="primary-button">
            Meet this week&apos;s worst <span aria-hidden>↗</span>
          </a>
          <Link href="/methodology" className="secondary-button">
            The facts behind the face
          </Link>
        </div>
        <p className="text-xs text-muted">
          Independent. Not affiliated with any health department. Now serving{" "}
          <Link href="/locations" className="text-nausea underline">verified locations</Link> — more cities on the way.
        </p>
      </div>
      <div className="hero-mascot" aria-hidden="true">
        <span><Face /></span>
        <p>
          PUBLIC RECORDS.
          <br />
          PRIVATE GAG REFLEX.
        </p>
      </div>
    </section>
  );
}
