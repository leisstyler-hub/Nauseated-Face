import Link from "next/link";
import { AdminControls } from "@/components/AdminControls";
import { JurisdictionToggles } from "@/components/JurisdictionToggles";
import { AdminSignOut } from "@/components/AdminSignOut";
import type { Operations } from "@/lib/admin";
import { WebsiteToggle } from "@/components/WebsiteToggle";
export function AdminControlsView({ data, websiteEnabled = true }: { data: Pick<Operations,'sources'>; websiteEnabled?: boolean }) {
  return <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
    <Link href="/admin" className="text-sm text-nausea underline">← Command Center</Link>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-nausea">Private business operations</p><h1 className="mt-3 text-3xl font-extrabold">Admin Controls</h1></div><AdminSignOut /></div>
    <p className="my-5 max-w-2xl text-sm leading-7 text-muted">Owner access. Refresh the sources already approved for publication, then review the results in your Command Center.</p>
    <div className="mb-8"><WebsiteToggle enabled={websiteEnabled} /></div>
    <AdminControls />
    <div className="mt-8"><JurisdictionToggles sources={data.sources} /></div>
    <Link href="/admin/imports" className="mt-6 inline-flex min-h-12 items-center text-sm text-nausea underline">View import history →</Link>
  </section>;
}
