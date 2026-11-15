import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STATUS_LABEL, findCity, findState, getCityEstablishments } from "@/lib/locations";
import { EstablishmentCard } from "@/components/EstablishmentCard";
import { SearchBox } from "@/components/SearchBox";
import { AdSlot } from "@/components/AdSlot";
import { formatInspectionDate } from "@/lib/format";
import { jurisdictionById } from "../../../../backend/jurisdictions.mjs";


export async function generateMetadata({ params }: { params: Promise<{ state: string; city: string }> }): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const state = await findState(stateSlug);
  const city = state && findCity(state, citySlug);
  if (!state || !city) return {};
  return {
    title: `${city.name}, ${state.code} restaurant inspections`,
    description: `Restaurant health inspection records for ${city.name}, ${state.code} from ${city.healthAuthority}. Latest results, violation details and official sources.`,
    robots: { index: city.covered, follow: true },
    alternates: { canonical: `/${state.slug}/${city.slug}` },
  };
}

export default async function CityPage({ params }: { params: Promise<{ state: string; city: string }> }) {
  const { state: stateSlug, city: citySlug } = await params;
  const state = await findState(stateSlug);
  const city = state && findCity(state, citySlug);
  if (!state || !city) notFound();

  let establishments: Awaited<ReturnType<typeof getCityEstablishments>> = [];
  let failed = false;
  if (city.covered) {
    try {
      establishments = await getCityEstablishments(state.code, city.name);
    } catch {
      failed = true;
    }
  }
  // Point rankings only make sense for violation-point jurisdictions; letter
  // grades and pass/fail systems never get folded into this list.
  const pointsBased = jurisdictionById(city.jurisdictionId)?.scoring?.type === "violation_points";
  const worst = (pointsBased ? [...establishments] : [])
    .filter((e) => e.jurisdictionId === city.jurisdictionId && e.latestScore !== null && Number(e.latestScore) > 0)
    .sort((a, b) => Number(b.latestScore) - Number(a.latestScore) || (a.name < b.name ? -1 : 1))
    .slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-nausea">
        <Link href="/" className="underline underline-offset-4">Home</Link>
        <span className="mx-3 text-muted" aria-hidden>/</span>
        <Link href={`/${state.slug}`} className="underline underline-offset-4">{state.name}</Link>
        <span className="mx-3 text-muted" aria-hidden>/</span>
        <span className="text-muted">{city.name}</span>
      </nav>
      <p className="text-xs font-bold tracking-widest text-nausea">PUBLIC RECORDS. PRIVATE GAG REFLEX.</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
        {city.name}, {state.code} 🤢
      </h1>
      <p className="my-5 max-w-2xl text-sm leading-relaxed text-muted">
        Inspection authority: {city.healthAuthority}. Coverage status: {STATUS_LABEL[city.status]}.
        {city.covered
          ? " Records below are saved official data — newest first. See the source coverage and date range below."
          : " This city’s official data has not been integrated yet, so we show no records rather than fake ones."}
      </p>
      {city.covered && <p className="text-sm leading-7 text-muted">{city.inspectionCount.toLocaleString('en-US')} saved inspections across {city.establishmentCount.toLocaleString('en-US')} businesses{city.firstInspectionDate && city.lastInspectionDate ? `, ${formatInspectionDate(city.firstInspectionDate)} to ${formatInspectionDate(city.lastInspectionDate)}` : ''}. <Link href="/coverage" className="text-nausea underline">Source coverage and refresh details</Link>.</p>}
      <div className="my-8">
        <SearchBox state={state.code} city={city.name} placeholder={`🤢 Search ${city.name} restaurants…`} />
      </div>

      {!city.covered && (
        <div className="rounded-xl border border-card-border bg-card p-6 text-sm text-muted">
          <p className="font-semibold text-foreground">Coming to Nauseated Face</p>
          <p className="mt-2">
            We have identified the official source for this market (<a className="text-nausea underline" href={city.sourceUrl} target="_blank" rel="noopener noreferrer">{city.jurisdictionName}</a>) and will activate it only after a verified
            import. Check back, or explore a covered city from the location menu.
          </p>
        </div>
      )}

      {city.covered && failed && (
        <p className="rounded-xl border border-critical/30 bg-critical-soft p-6 text-sm text-critical">
          Records are temporarily unavailable. Please try again shortly.
        </p>
      )}

      {city.covered && !failed && establishments.length === 0 && (
        <div className="rounded-xl border border-card-border bg-card p-6 text-sm text-muted">
          No saved records for {city.name} yet. Our {city.jurisdictionName} sample grows with every daily refresh; this
          city will fill in as its establishments appear in the latest official data.
        </div>
      )}

      {establishments.length > 0 && (
        <>
          {worst.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold">
                Highest violation points in the saved sample — {city.name} <span aria-hidden>🤢</span>
              </h2>
              <p className="mt-1 text-xs text-muted">
                Ranked by each establishment’s most recent saved inspection score under the {city.jurisdictionName}{" "}
                violation-point system, among at most 60 newest saved establishments. Ties sort by name. No minimum score beyond a positive total; no fixed weekly window. Historical findings, not current conditions.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {worst.map((e) => (
                  <EstablishmentCard key={e.id} establishment={e} stateSlug={state.slug} />
                ))}
              </div>
            </section>
          )}
          <AdSlot kind="in-feed" />
          <section className="mt-10">
            <h2 className="text-xl font-bold">Latest saved inspections</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {establishments.map((e) => (
                <EstablishmentCard key={e.id} establishment={e} stateSlug={state.slug} />
              ))}
            </div>
            {establishments[0]?.latestInspectionDate && (
              <p className="mt-6 text-xs text-muted">
                Newest saved inspection: {formatInspectionDate(establishments[0].latestInspectionDate)}. Coverage is a
                limited sample of {city.jurisdictionName}; absence of a restaurant is not a rating.
              </p>
            )}
          </section>
        </>
      )}
    </section>
  );
}
