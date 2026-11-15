import Link from 'next/link';
import {getSourceCoverage,STATUS_LABEL} from '@/lib/locations';
import {formatInspectionDate,formatRefreshedAt} from '@/lib/format';
export const metadata={title:'Data sources and coverage',description:'Official inspection sources, published date ranges, saved history and refresh information.'};
export default async function CoveragePage(){
 let sources:Awaited<ReturnType<typeof getSourceCoverage>>=[];let failed=false;
 try{sources=await getSourceCoverage();}catch{failed=true;}
 return <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
  <p className="text-xs font-bold tracking-widest text-nausea">THE RECORD BEHIND THE RANKING</p><h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Data sources &amp; coverage</h1>
  <p className="my-5 max-w-3xl text-sm leading-7 text-muted">Dates below describe the inspection history saved from each official source. A full-source import captures the records that source publishes; it cannot establish inspections the source never published or current conditions at a business.</p>
  {failed||!sources.length?<p role="alert" className="rounded-xl border border-card-border p-6 text-muted">Coverage details are temporarily unavailable. Please try again shortly.</p>:<div className="grid gap-5 md:grid-cols-2">{sources.map(source=>{const published=source.enabled&&source.inspectionCount>0;return <article key={source.id} className="min-w-0 rounded-xl border border-card-border bg-card p-5 sm:p-7">
   <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-xl font-bold">{source.name}</h2><span className="text-xs font-bold text-nausea">{published?STATUS_LABEL[source.coverageStatus]:'Not currently published'}</span></div>
   <p className="mt-3 text-sm leading-7 text-muted">{source.healthAuthority}</p>
   {published?<><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-muted">Saved history</dt><dd className="mt-1 font-bold">{source.firstInspectionDate&&source.lastInspectionDate?`${formatInspectionDate(source.firstInspectionDate)} to ${formatInspectionDate(source.lastInspectionDate)}`:'Dates not available'}</dd></div><div><dt className="text-muted">Saved records</dt><dd className="mt-1">{source.inspectionCount.toLocaleString('en-US')} inspections across {source.establishmentCount.toLocaleString('en-US')} businesses</dd></div><div><dt className="text-muted">Last successful refresh</dt><dd className="mt-1">{source.lastSuccess?formatRefreshedAt(new Date(source.lastSuccess)):'Not available'}</dd></div></dl><p className="mt-4 text-sm leading-7 text-muted">{source.fullImportVerified?'Full published-source snapshot verified at the last successful import.':'Partial saved sample; additional source history has not yet been imported.'}</p>{source.lastAttemptStatus==='error'&&<p className="mt-3 text-sm leading-7 text-warning">Latest refresh failed. Previous saved records remain available.</p>}</>:<p className="my-4 text-sm leading-7 text-muted">No inspection records from this source are currently published on this site.</p>}
   <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-bold text-nausea underline">Official source</a>
  </article>})}</div>}
  <p className="mt-7 max-w-3xl text-sm leading-7 text-muted">City browsing combines capitalization, punctuation and known locality aliases. Original city wording remains on the source records. Unrecognized or ambiguous source locations stay in regional records and search instead of becoming additional city choices.</p>
  <div className="mt-7 flex flex-wrap gap-6 text-sm text-nausea"><Link href="/locations" className="underline">Browse locations</Link><Link href="/methodology" className="underline">How rankings work</Link></div>
 </section>;
}
