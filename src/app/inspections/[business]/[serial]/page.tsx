import {OfficialResultBadge} from "@/components/OfficialResultBadge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getInspectionDetail, SOURCE_DATASET_URL } from "@/lib/kingcounty";
import { formatInspectionDate, titleCase } from "@/lib/format";
import { concernPercent } from "@/lib/ranking";

export const metadata = { title: 'Full inspection' };

export default async function InspectionPage({ params, searchParams }: {
  params: Promise<{ business: string; serial: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { business, serial } = await params;
  const { date } = await searchParams;
  if (typeof date !== 'string' || date.length > 40 || !/^\d{4}-\d{2}-\d{2}(?:T[\d:.Z+-]+)?$/.test(date) || business.length > 200 || serial.length > 200) notFound();
  let detail;
  try { detail = await getInspectionDetail(business, serial, date); }
  catch {
    return <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6"><Link href="/inspections" className="text-nausea underline">Back to inspections</Link><h1 className="mt-8 text-3xl font-extrabold">Inspection temporarily unavailable</h1><p className="my-5 text-muted">We could not load the complete record. Please try again or check the official county source.</p><a href={SOURCE_DATASET_URL} className="text-nausea underline">Open King County records</a></section>;
  }
  const { event, saved, observedAt } = detail;
  if (!event) notFound();
  const sourceUrl = `https://data.kingcounty.gov/resource/r878-4sxa.json?${new URLSearchParams({ business_id: business, inspection_serial_num: serial, inspection_date: date })}`;
  return (
    <article className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-nausea"><Link href="/inspections" className="underline underline-offset-4">Back to inspections</Link><span className="mx-3 text-muted" aria-hidden>/</span><span className="text-muted">Full record</span></nav>
      <p className="text-xs font-bold tracking-widest text-nausea">THE WHOLE INSPECTION. NO CHERRY-PICKING.</p>
      <h1 className="mt-3 break-words text-3xl font-extrabold tracking-tight sm:text-5xl">{titleCase(event.name)}</h1>
      <p className="mt-3 text-muted">{titleCase(event.address)}, {titleCase(event.city)} {event.zipCode}</p>
      <div className="my-6 flex flex-wrap items-center gap-3 text-sm"><time dateTime={event.inspectionDate}>{formatInspectionDate(event.inspectionDate)}</time><span className="text-muted">{event.inspectionType}</span><OfficialResultBadge result={event.result}/></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[[`${concernPercent(event)}%`, 'Nauseated Face Index v1'], [String(event.score ?? 'Not recorded'), 'Official inspection score'], [String(event.violationCount), 'Recorded violations'], [String(event.redViolationCount), 'Red violations']].map(([value, label]) => <div key={label} className="rounded-xl border border-card-border bg-card p-4"><p className="text-2xl font-extrabold text-nausea">{value}</p><p className="mt-1 text-xs text-muted">{label}</p></div>)}
      </div>
      <p className="mt-5 text-sm text-muted">Closure recorded at this inspection: <strong className="text-foreground">{event.closedBusiness ? 'Yes' : 'No'}</strong>. This is a historical inspection, not a current safety determination. The index reflects violation points capped at 100; it is not a probability of illness. <Link href="/methodology" className="text-nausea underline">How the index works</Link>.</p>
      <section className="mt-10" aria-labelledby="violations-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2"><h2 id="violations-heading" className="text-2xl font-extrabold">Every recorded violation</h2><span className="text-sm text-muted">{event.totalViolationPoints} total violation points</span></div>
        {event.violations.length ? <ol className="space-y-3">{event.violations.map((v, i) => <li key={i} className="rounded-xl border border-card-border bg-card p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold"><span className={v.type === 'RED' ? 'text-critical' : 'text-muted'}>{i + 1}. {v.type ?? 'UNCLASSIFIED'}</span><span>{v.points} points</span></div><p className="break-words text-sm leading-relaxed">{v.description}</p></li>)}</ol> : <p className="rounded-xl border border-card-border bg-card p-5 text-muted">No violation descriptions are recorded for this inspection.</p>}
      </section>
      <footer className="mt-10 rounded-xl border border-card-border p-5 text-sm">
        <h2 className="font-bold">Straight from the public record</h2>
        <p className="mt-2 text-muted">{saved ? `Saved county record${observedAt ? `; observed ${formatInspectionDate(observedAt)}` : ''}. Published history may not include every inspection ever performed.` : 'Official King County source, cached for up to 15 minutes.'} Descriptions are shown as recorded.</p>
        <dl className="my-4 space-y-2 break-all text-xs text-muted"><div><dt className="font-bold">Business ID</dt><dd>{business}</dd></div><div><dt className="font-bold">Inspection ID</dt><dd>{serial}</dd></div></dl>
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-nausea underline underline-offset-4">View original King County record <span aria-hidden>↗</span></a>
      </footer>
    </article>
  );
}
