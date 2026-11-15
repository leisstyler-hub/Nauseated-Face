import { getHomeArea } from "@/lib/home-area";
import Link from "next/link";
import type { Metadata } from "next";
import { SearchBox } from "@/components/SearchBox";
import { EstablishmentCard } from "@/components/EstablishmentCard";
import { getStates, searchEstablishments, searchAcrossCities } from "@/lib/locations";

export const metadata: Metadata = {
  title: "Search restaurant inspections",
  description: "Search restaurants, cities, addresses and ZIP codes across every market Nauseated Face covers. Official inspection records, zero cherry-picking.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; state?: string; city?: string; page?: string; sort?: string; jurisdiction?: string }> }) {
  const params = await searchParams;
  const area = await getHomeArea();
  const q = typeof params.q === "string" ? params.q.slice(0, 120) : "";
  const states = await getStates();
  const state = typeof params.state === "string" ? params.state.slice(0, 2).toUpperCase() : area.stateCode;
  const city = typeof params.city === "string" ? params.city.slice(0, 80) : area.city;
  const jurisdiction = typeof params.jurisdiction === "string" ? params.jurisdiction.slice(0,80) : (params.state === undefined && params.city === undefined ? area.jurisdictionId : "");
  const sort = ["date", "name", "result"].includes(params.sort ?? "") ? params.sort! : "date";
  const requested = Number(params.page);
  const page = Number.isInteger(requested) && requested > 0 && requested <= 5000 ? requested : 1;
  const stateSlugByCode = new Map(states.map((s) => [s.code, s.slug]));
  let results: Awaited<ReturnType<typeof searchEstablishments>> = [];
  let elsewhere: Awaited<ReturnType<typeof searchEstablishments>> = [];
  let expansionFailed = false;
  let failed = false;
  if (q.trim().length >= 2) {
    try {
      const groups = await searchAcrossCities(q, state, city, (page - 1) * 20, sort, jurisdiction);
      results = groups.local; elsewhere = groups.elsewhere; expansionFailed = groups.expansionFailed;
    } catch {
      failed = true;
    }
  }
  const hasNext = results.length > 20;
  results = results.slice(0, 20);
  const stateName = states.find(s=>s.code===state)?.name ?? state;
  const statewideHref = `/search?${new URLSearchParams({q,state,city:"",jurisdiction:"",sort})}`;
  const pageHref = (n: number) => `/search?${new URLSearchParams({ q, state, city, jurisdiction, sort, page: String(n) })}`;
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-bold tracking-widest text-nausea">PICK YOUR POISON. FIGURATIVELY.</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">Search restaurant inspections</h1>
      <p className="my-5 max-w-2xl text-sm leading-relaxed text-muted">
        Search by restaurant name, address, city or ZIP across every covered market. Results come from saved official
        health-department records; coverage per city is disclosed on its page.
      </p>
      <SearchBox key={`${q}-${state}-${city}`} autoFocus initialQuery={q} state={state} city={city} jurisdiction={jurisdiction} />
      <form action="/search" className="mt-5 flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="q" value={q} />
        <label className="flex flex-col gap-1">State<select name="state" defaultValue={state} className="rounded-lg border border-card-border bg-card p-2"><option value="">All available states</option>{states.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select></label>
        <label className="flex flex-col gap-1">City<input name="city" defaultValue={city} placeholder="All cities" className="w-40 rounded-lg border border-card-border bg-card p-2" /></label>
        <label className="flex flex-col gap-1">Sort<select name="sort" defaultValue={sort} className="rounded-lg border border-card-border bg-card p-2"><option value="date">Latest inspection</option><option value="name">Restaurant name</option><option value="result">Official result (A-Z)</option></select></label>
        <button className="rounded-lg border border-nausea px-4 py-2 text-nausea">Apply filters</button>
      </form>
      <p className="mt-3 text-xs text-muted">Official results retain each authority&apos;s wording. Incompatible numeric scores are never sorted together nationally.</p>
      <nav aria-label="Search result pages" className="mt-6 flex flex-wrap gap-6 text-sm text-nausea">{page > 1 && <Link href={pageHref(page - 1)}>Previous page</Link>}{hasNext && <Link href={pageHref(page + 1)}>Next page</Link>}</nav>
      {failed && (
        <p className="mt-8 rounded-xl border border-critical/30 bg-critical-soft p-6 text-sm text-critical">
          Search is temporarily unavailable. Please try again shortly.
        </p>
      )}
      {!failed && q.trim().length >= 2 && (
        <>
          <h2 className="mt-10 text-xl font-bold">
            {results.length === 0 ? city ? `No matches in ${city}` : "No matches in this search" : `${results.length} result${results.length === 1 ? "" : "s"} on this page`}
            <span className="ml-2 text-sm font-normal text-muted">for “{q.trim()}”</span>
          </h2>
          {results.length === 0 ? (
            <p className="mt-4 max-w-2xl text-sm text-muted">
              No matching saved records were found for these filters. A missing restaurant does not establish a clean history. Try a shorter name or explore the same-state matches below.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {results.map((e) => (
                <EstablishmentCard key={e.id} establishment={e} stateSlug={stateSlugByCode.get(e.stateCode) ?? e.stateCode.toLowerCase()} />
              ))}
            </div>
          )}
          {city && state && <section className="mt-10 border-t border-card-border pt-6" aria-labelledby="statewide-matches">
            <h2 id="statewide-matches" className="text-xl font-bold">Elsewhere in {stateName}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Matching saved records outside {city}, within {stateName}. Your homepage city selection stays the same.</p>
            {expansionFailed ? <p role="status" className="mt-4 text-sm text-warning">Other-city matches are temporarily unavailable. Local results are still shown.</p> : elsewhere.length>0 ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{elsewhere.slice(0,20).map(e=><EstablishmentCard key={e.id} establishment={e} stateSlug={stateSlugByCode.get(e.stateCode)??e.stateCode.toLowerCase()}/>)}</div> : <p className="mt-4 text-sm text-muted">No additional matches in this state.</p>}
            <Link href={statewideHref} className="mt-5 inline-block text-sm font-bold text-nausea underline">Search all of {stateName}</Link>
          </section>}
        </>
      )}
    </section>
  );
}
