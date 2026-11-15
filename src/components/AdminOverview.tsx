import type { Operations } from "@/lib/admin";
import { AdminSignOut } from "@/components/AdminSignOut";
import { adminSections } from "@/lib/admin-navigation";
import Link from "next/link";
export function AdminOverview({data,email}:{data:Operations;email:string}){
 return <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
  <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-widest text-nausea">PRIVATE BUSINESS OPERATIONS</p><h1 className="mt-3 text-3xl font-extrabold">Command Center</h1></div><AdminSignOut/></div>
  <p className="my-5 break-words text-sm leading-7 text-muted">Signed in as {email}. Choose a section to manage the website, review traffic or inspect source operations.</p>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{adminSections.map(item=><Link key={item.href} href={item.href} className="flex min-h-36 flex-col justify-between rounded-xl border border-card-border bg-card p-5 transition-colors hover:border-nausea"><h2 className="text-lg font-bold text-nausea">{item.label} <span aria-hidden="true">→</span></h2><p className="mt-3 text-sm leading-6 text-muted">{item.description}</p></Link>)}{['Finance','Messaging'].map(label=><div key={label} className="rounded-xl border border-dashed border-card-border p-5"><button disabled className="text-lg font-bold text-muted">{label}</button><p className="mt-3 text-sm leading-6 text-muted">Planned. No {label.toLowerCase()} service is connected.</p></div>)}</div>
  <h2 className="mb-4 mt-10 text-xl font-bold">Saved inspection data</h2>
  <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(data.counts).map(([label,count])=><div key={label} className="min-w-0 rounded-xl border border-card-border bg-card p-5"><dt className="text-xs uppercase tracking-wide text-muted">{label.replaceAll('_',' ')}</dt><dd className="mt-2 text-3xl font-bold">{String(count)}</dd></div>)}</dl>
  <p className="mt-4 text-xs leading-6 text-muted">Inspection counts include limited samples. Traffic metrics are in the dedicated Traffic section.</p>
 </section>;
}
