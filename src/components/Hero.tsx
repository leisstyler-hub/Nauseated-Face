import { getHomeArea } from "@/lib/home-area";
import Link from "next/link";
import { Face } from "@/components/Face";
import { SearchBox } from "@/components/SearchBox";
import { ChooseCityButton } from "@/components/ChooseCityButton";
export async function Hero() {
  const area = await getHomeArea();
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">
          The food-safety watchdog no one asked for.
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
          Real inspections. Real disgusting. Explore official food inspection records from the cities we cover, with each health department&apos;s findings, dates, and scoring kept in context.
        </p>
        <div className="my-2">
          <SearchBox clearOnNavigate state={area.stateCode} city={area.city} jurisdiction={area.jurisdictionId} />
        </div>
        <div className="hero-actions">
          {area.selected ? <a href="#worst" className="primary-button">
            Meet this week&apos;s worst <span aria-hidden>↗</span>
          </a> : <ChooseCityButton/>}
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
          THE FULL PICTURE.
        </p>
      </div>
    </section>
  );
}
