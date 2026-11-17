import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STATUS_LABEL, findState, getCoveredCities } from "@/lib/locations";
import { SearchBox } from "@/components/SearchBox";
import { Face } from '@/components/Face';


export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const state = await findState((await params).state);
  if (!state) return {};
  return {
    title: `${state.name} restaurant inspections`,
    description: `Restaurant health inspection records, rankings and stories across ${state.name}. Official sources, honest coverage statuses.`,
    robots: { index: state.cities.some(city => city.covered), follow: true },
    alternates: { canonical: `/${state.slug}` },
  };
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const state = await findState((await params).state);
  if (!state) notFound();
  let covered: Awaited<ReturnType<typeof getCoveredCities>> = [];
  try {
    covered = await getCoveredCities();
  } catch {
    // Coverage counts are an enhancement; the registry list below stays accurate.
  }
  const countFor = (city: string) => covered.find((c) => c.stateCode === state.code && c.city?.toLowerCase() === city.toLowerCase())?.establishmentCount ?? 0;
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-nausea">
        <Link href="/" className="underline underline-offset-4">Home</Link>
        <span className="mx-3 text-muted" aria-hidden>/</span>
        <span className="text-muted">{state.name}</span>
      </nav>
      <p className="text-xs font-bold tracking-widest text-nausea">EXPLORE RESTAURANT INSPECTIONS NEAR YOU.</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">{state.name} <Face /></h1>
      <p className="my-5 max-w-2xl text-sm leading-relaxed text-muted">
        Pick a city to explore its saved inspection records. We only mark a city available after its official data is
        imported and verified — no pretend coverage.
      </p>
      <div className="my-8">
        <SearchBox state={state.code} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.cities.map((city) => {
          const count = countFor(city.name);
          return (
            <Link
              key={city.slug}
              href={`/${state.slug}/${city.slug}`}
              className="flex flex-col gap-1 rounded-xl border border-card-border bg-card p-5 transition-colors hover:border-nausea"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-bold">{city.name}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${city.covered ? "text-nausea" : "text-muted"}`}>
                  {STATUS_LABEL[city.status]}
                </span>
              </span>
              <span className="text-sm text-muted">
                {city.jurisdictionName} · {city.covered && count > 0 ? `${count} saved establishment${count === 1 ? "" : "s"}` : city.covered ? "records saved countywide" : "official source identified, not yet integrated"}
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-10 text-xs text-muted">
        Statuses come from our live coverage registry. “Coming Soon” means a verified official source exists but our
        adapter has not shipped; “Temporarily Unavailable” means no permitted machine-readable source is verified yet.
      </p>
    </section>
  );
}
