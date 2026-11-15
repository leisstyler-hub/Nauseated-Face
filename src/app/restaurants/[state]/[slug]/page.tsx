import {OfficialResultBadge} from "@/components/OfficialResultBadge";
import {InspectionHistoryChart} from "@/components/InspectionHistoryChart";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findState, getCityEstablishments, getEstablishmentProfile } from "@/lib/locations";
import { EstablishmentCard } from "@/components/EstablishmentCard";
import { formatInspectionDate, titleCase } from "@/lib/format";
import { inspectionPath } from "../../../../../backend/inspection-detail.mjs";
import { citySlug as slugify } from "../../../../../backend/jurisdictions.mjs";

export async function generateMetadata({ params }: { params: Promise<{ state: string; slug: string }> }): Promise<Metadata> {
  const { state: stateSlug, slug } = await params;
  const state = await findState(stateSlug);
  if (!state) return {};
  let profile;
  try {
    profile = await getEstablishmentProfile(state.code, slug);
  } catch {
    return {};
  }
  if (!profile) return {};
  const where = [profile.city && titleCase(profile.city), state.code].filter(Boolean).join(", ");
  return {
    title: `${titleCase(profile.name)} — ${where} health inspections`,
    description: `Official health inspection history for ${titleCase(profile.name)}${where ? ` in ${where}` : ""}: results, violations and source records from ${profile.jurisdiction?.healthAuthority ?? "the responsible health authority"}.`,
    alternates: { canonical: `/restaurants/${state.slug}/${slug}` },
  };
}

export default async function RestaurantPage({ params }: { params: Promise<{ state: string; slug: string }> }) {
  const { state: stateSlug, slug } = await params;
  const state = await findState(stateSlug);
  if (!state || slug.length > 512) notFound();
  let profile;
  try {
    profile = await getEstablishmentProfile(state.code, slug);
  } catch {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6">
        <h1 className="text-3xl font-extrabold">Profile temporarily unavailable</h1>
        <p className="my-5 text-muted">We could not load this restaurant’s records. Please try again shortly.</p>
        <Link href="/search" className="text-nausea underline">Back to search</Link>
      </section>
    );
  }
  if (!profile) notFound();
  const cityPath = profile.city ? `/${state.slug}/${slugify(profile.city)}` : `/${state.slug}`;
  let related: Awaited<ReturnType<typeof getCityEstablishments>> = [];
  if (profile.city) {
    try {
      related = (await getCityEstablishments(state.code, profile.city, 5)).filter((e) => e.id !== profile.id).slice(0, 4);
    } catch {
      // Related listings are optional; the profile itself already rendered.
    }
  }
  const latest = profile.inspections[0];
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://nauseated-face.app/" },
      { "@type": "ListItem", position: 2, name: state.name, item: `https://nauseated-face.app/${state.slug}` },
      ...(profile.city ? [{ "@type": "ListItem", position: 3, name: titleCase(profile.city), item: `https://nauseated-face.app${cityPath}` }] : []),
      { "@type": "ListItem", position: profile.city ? 4 : 3, name: titleCase(profile.name), item: `https://nauseated-face.app/restaurants/${state.slug}/${slug}` },
    ],
  };
  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replaceAll("<", "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-nausea">
        <Link href={`/${state.slug}`} className="underline underline-offset-4">{state.name}</Link>
        {profile.city && (
          <>
            <span className="mx-3 text-muted" aria-hidden>/</span>
            <Link href={cityPath} className="underline underline-offset-4">{titleCase(profile.city)}</Link>
          </>
        )}
        <span className="mx-3 text-muted" aria-hidden>/</span>
        <span className="text-muted">Profile</span>
      </nav>
      <p className="text-xs font-bold tracking-widest text-nausea">EVERYBODY HAS A PAST. HERE’S THE OFFICIAL ONE.</p>
      <h1 className="mt-3 break-words text-3xl font-extrabold tracking-tight sm:text-5xl">{titleCase(profile.name)}</h1>
      <p className="mt-3 text-muted">
        {[profile.address && titleCase(profile.address), profile.city && titleCase(profile.city), state.code].filter(Boolean).join(", ")} {profile.zip ?? ""}
      </p>
      <dl className="my-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-muted">Inspection authority</dt>
          <dd>{profile.jurisdiction?.healthAuthority ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-muted">Latest saved inspection</dt>
          <dd>
            {latest?.inspectionDate ? formatInspectionDate(latest.inspectionDate) : "None saved yet"}
            <span className="mt-2 block"><OfficialResultBadge result={latest?.fields.inspection_result}/></span>
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-muted">Scoring system</dt>
          <dd>
            {profile.jurisdiction?.scoring.type === "violation_points"
              ? "Violation points (lower is better); red = high-risk, blue = maintenance"
              : "As published by the responsible authority"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-muted">Data freshness</dt>
          <dd>{latest?.observedAt ? `Observed ${formatInspectionDate(latest.observedAt)}${latest.stale ? " (refresh pending)" : ""}` : "Pending first refresh"}</dd>
        </div>
      </dl>
      <p className="mb-8 max-w-2xl text-sm text-muted">
        These are historical official findings, not a statement of current conditions — kitchens change, people improve,
        and reinspections exist for a reason. Every record links to its original source.
      </p>

      <InspectionHistoryChart inspections={profile.inspections} violationPoints={profile.jurisdiction?.scoring.type === "violation_points"}/>
      <h2 className="text-xl font-bold">Inspection timeline</h2>
      <p className="mt-3 text-sm leading-7 text-muted">{profile.inspections.length} saved inspections{profile.inspections.at(-1)?.inspectionDate && latest?.inspectionDate ? `, ${formatInspectionDate(profile.inspections.at(-1)!.inspectionDate!)} to ${formatInspectionDate(latest.inspectionDate)}` : ''}. This includes historical records available from the published source.</p>
      <ol className="mt-4 flex flex-col gap-4">
        {profile.inspections.map((inspection) => (
          <li key={inspection.id} id={`inspection-${inspection.id}`} className="scroll-mt-24 rounded-xl border border-card-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-bold">
                {inspection.inspectionDate ? formatInspectionDate(inspection.inspectionDate) : "Date not recorded"}
              </span>
              <span className="text-sm text-muted">{inspection.fields.inspection_type ?? ""}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <OfficialResultBadge result={inspection.fields.inspection_result}/>
              {inspection.fields.inspection_score !== undefined && <span className="text-muted">Official score as published: {inspection.fields.inspection_score}</span>}
            </div>
            {inspection.violations.length > 0 ? <div className="mt-4"><h3 className="text-sm font-bold">Official wording: what inspectors found</h3><ul className="mt-2 space-y-3 text-sm text-muted">{inspection.violations.map((v, index) => <li key={index} className="whitespace-pre-wrap break-words">{v.type && <span className="font-semibold">{v.type}: </span>}{v.description}{v.points !== null && <span> ({v.points} points)</span>}</li>)}</ul></div> : <p className="mt-3 text-xs text-muted">No violation wording supplied in this saved record. This is not a current safety rating.</p>}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
              {profile.jurisdiction?.id === "wa-king" && inspection.inspectionDate && (
                <Link
                  href={inspectionPath({ businessId: inspection.businessId, serialNum: inspection.serial, inspectionDate: inspection.inspectionDate })}
                  className="font-semibold text-nausea underline underline-offset-2"
                >
                  Full record with every violation
                </Link>
              )}
              <a href={inspection.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-muted underline underline-offset-2">
                Official source <span aria-hidden>↗</span>
              </a>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted">
        Published source history may not include every inspection this establishment has ever had. Disagree with a
        record? <Link href="/corrections" className="text-nausea underline">Request a correction</Link>.
      </p>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">More from {titleCase(profile.city!)}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {related.map((e) => (
              <EstablishmentCard key={e.id} establishment={e} stateSlug={state.slug} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
