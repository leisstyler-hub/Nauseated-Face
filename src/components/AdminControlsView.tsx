import Link from "next/link";
import { AdminControls } from "@/components/AdminControls";
import { AdminSignOut } from "@/components/AdminSignOut";
import type { Operations } from "@/lib/admin";
export function AdminControlsView({ data }: { data: Operations }) {
  return <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
    <Link href="/admin" className="text-sm text-nausea underline">← Command Center</Link>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-nausea">Private business operations</p><h1 className="mt-3 text-3xl font-extrabold">Admin Controls</h1></div><AdminSignOut /></div>
    <p className="my-5 max-w-2xl text-sm leading-7 text-muted">Owner access. Refresh the sources already approved for publication, then review the results in your Command Center.</p>
    <AdminControls />
    <h2 className="mb-4 mt-10 text-xl font-bold">Enabled sources</h2>
    <div className="grid gap-4 sm:grid-cols-2">{data.sources.filter(source => source.enabled).map(source => <article key={source.id} className="min-w-0 rounded-xl border border-card-border bg-card p-5"><h3 className="font-bold">{source.healthAuthority}</h3><p className="mt-2 text-sm text-muted">{source.establishmentCount} saved establishments · {source.coverageStatus.replaceAll("_", " ")}</p><p className="mt-3 break-words text-xs leading-6 text-muted">Last successful import: {source.lastSuccess ?? "Not yet recorded"}</p></article>)}</div>
    <Link href="/admin#import-history" className="mt-6 inline-flex min-h-12 items-center text-sm text-nausea underline">View import history and source health →</Link>
  </section>;
}
