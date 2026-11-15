import type { Operations } from "@/lib/admin";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth, ownerSession } from "../../../backend/admin-auth.mjs";
import { openSiteStore } from "../../../backend/production.mjs";
import { AdminSignOut } from "@/components/AdminSignOut";

export default async function AdminPage() {
  const session = await ownerSession(getAdminAuth(), await headers());
  if (!session) redirect("/admin/login");
  const store = openSiteStore();
  let data: Operations;
  try { data = await store.operations(); } finally { await store.close(); }
  return <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-widest text-nausea">PRIVATE BUSINESS OPERATIONS</p><h1 className="mt-3 text-3xl font-extrabold">Command Center 🤢</h1></div><AdminSignOut /></div>
    <p className="my-5 text-sm text-muted">Signed in as {session.user.email}. Read-only operations overview. Counts reflect saved records, including limited samples.</p>
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(data.counts).map(([label, count]) => <div key={label} className="rounded-xl border border-card-border bg-card p-5"><dt className="text-xs uppercase tracking-wide text-muted">{label.replaceAll("_", " ")}</dt><dd className="mt-2 text-3xl font-bold">{String(count)}</dd></div>)}</dl>
    <h2 className="mb-4 mt-10 text-xl font-bold">Data sources</h2>
    <div className="grid gap-4 md:grid-cols-2">{data.sources.map(source => <article key={source.id} className="min-w-0 rounded-xl border border-card-border bg-card p-5"><h3 className="font-bold">{source.healthAuthority}</h3><p className="mt-2 text-sm text-muted">{source.enabled ? "Enabled" : "Inactive"} · {source.coverageStatus.replaceAll("_", " ")} · {source.establishmentCount} saved establishments</p><p className="mt-2 break-words text-xs text-muted">Last success: {source.lastSuccess ?? "No successful import"}</p><p className="mt-2 text-xs text-muted">Last attempt: {source.lastAttempt?.status ?? "Not attempted"}</p><a href={source.sourceUrl} className="mt-3 inline-block text-xs text-nausea underline" target="_blank" rel="noreferrer">Official publisher</a></article>)}</div>
    <h2 className="mb-4 mt-10 text-xl font-bold">Import history</h2>
    <div className="overflow-x-auto rounded-xl border border-card-border"><table className="w-full text-left text-sm"><caption className="sr-only">Most recent 20 import runs</caption><thead className="bg-card"><tr>{["Source", "Started", "Status", "Rows", "Changes"].map(label => <th key={label} className="whitespace-nowrap p-3">{label}</th>)}</tr></thead><tbody>{data.runs.map(run => <tr key={String(run.id)} className="border-t border-card-border"><td className="p-3">{run.jurisdiction_id}</td><td className="whitespace-nowrap p-3">{run.started_at}</td><td className="p-3">{run.status}</td><td className="p-3">{run.row_count ?? "—"}</td><td className="p-3">{run.changed_count ?? "—"}</td></tr>)}</tbody></table></div>
    <h2 className="mb-3 mt-10 text-xl font-bold">Storage & business connections</h2><p className="text-sm text-muted">Inspection schema: {(Number(data.storage.schemaBytes) / 1024 / 1024).toFixed(2)} MiB. Shared database: {(Number(data.storage.databaseBytes) / 1024 / 1024).toFixed(2)} MiB.</p><p className="mt-3 text-sm text-muted">{data.storage.note} Advertising, Analytics and Search Console are not connected. No traffic or revenue estimates are displayed.</p>
  </section>;
}
