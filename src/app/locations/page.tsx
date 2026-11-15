import type { Metadata } from "next";
import Link from "next/link";
import { STATUS_LABEL, getStates } from "@/lib/locations";

export const metadata: Metadata = {
  title: "All available locations",
  description: "Every state and city Nauseated Face covers or is bringing online, with honest coverage statuses for each market.",
  alternates: { canonical: "/locations" },
};

export default async function LocationsPage() {
  const states = await getStates();
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-bold tracking-widest text-nausea">UNITED STATES → STATE → CITY → RESTAURANT</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">All available locations</h1>
      <p className="my-5 max-w-2xl text-sm leading-relaxed text-muted">
        Every market in our coverage registry, with its real status. A city only becomes “Data Available” after its
        official records are imported and verified — we don’t decorate the map.
      </p>
      <p className="mb-6 text-sm text-muted">Washington locations are ordered by saved inspection count, highest first. Counts describe historical inspections, not current safety. <Link href="/coverage" className="text-nausea underline">Data sources and date ranges</Link>.</p>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {states.map((state) => (
          <div key={state.code}>
            <h2 className="text-xl font-bold">
              <Link href={`/${state.slug}`} className="transition-colors hover:text-nausea">
                {state.name}
              </Link>
            </h2>
            <ul className="mt-3 flex flex-col gap-1">
              {state.cities.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`/${state.slug}/${city.slug}`}
                    className="flex items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-card"
                  >
                    <span>{city.name}{city.covered&&<span className="mt-0.5 block text-xs text-muted">{city.inspectionCount.toLocaleString("en-US")} inspections</span>}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${city.covered ? "text-nausea" : "text-muted"}`}>
                      {STATUS_LABEL[city.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
