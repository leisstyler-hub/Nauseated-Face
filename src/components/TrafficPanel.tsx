"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TrafficReport } from "@/lib/traffic";
const ranges=[['today','Today'],['3','3 days'],['7','Weekly'],['30','30 days'],['month','This month']];
const date=(value:string)=>new Date(value).toLocaleString('en-US',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'});
export function TrafficPanel({initialReport,initialError=""}:{initialReport:TrafficReport|null;initialError?:string}){
 const [report,setReport]=useState(initialReport),[range,setRange]=useState('7'),[error,setError]=useState(initialError),[busy,setBusy]=useState(false);
 const controller=useRef<AbortController|null>(null);
 const load=useCallback(async(next:string)=>{
  controller.current?.abort();const current=new AbortController();controller.current=current;setBusy(true);
  try{const response=await fetch('/api/admin/traffic?range='+next,{cache:'no-store',signal:current.signal});const body=await response.json();if(!response.ok)throw Error(body.error||'Traffic reporting unavailable');setReport(body);setError('');}
  catch(e){if(!current.signal.aborted)setError(e instanceof Error?e.message:'Traffic reporting unavailable');}
  finally{if(!current.signal.aborted)setBusy(false);}
 },[]);
 useEffect(()=>{const interval=setInterval(()=>void load(range),60000);return()=>clearInterval(interval);},[range,load]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const maximum=Math.max(1,...(report?.days.map(d=>d.visitors)??[]));
 return <div>
  <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-extrabold">Traffic</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-muted">Measured browser visitors, visits and page views. Pacific calendar days. Updates every minute.</p></div><button onClick={()=>void load(range)} disabled={busy} className="min-h-12 rounded-lg border border-card-border px-5 font-bold disabled:opacity-50">{busy?'Refreshing...':'Refresh metrics'}</button></div>
  <div role="group" aria-label="Traffic date range" className="my-6 flex flex-wrap gap-2">{ranges.map(([value,label])=><button key={value} aria-pressed={range===value} onClick={()=>{setRange(value);void load(value);}} className={`min-h-11 rounded-lg border px-4 text-sm font-bold ${range===value?'border-nausea bg-nausea-soft text-nausea':'border-card-border bg-card text-muted'}`}>{label}</button>)}</div>
  {error&&<p role="alert" className="mb-5 rounded-xl border border-warning p-4 text-sm text-warning">{error}{report?' Showing the last successful report below.':''}</p>}
  {report&&<div aria-busy={busy}>
   <p className="mb-4 text-xs leading-6 text-muted">Report window: {date(report.start)} to {date(report.end)}.</p>
   <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Visitors',report.visitors],['Visits',report.visits],['Page views',report.pageviews],['Returning visitors',report.returningPercent===null?'Not enough data':report.returningPercent+'%']].map(([label,value])=><div key={label} className="min-w-0 rounded-xl border border-card-border bg-card p-5"><dt className="text-sm text-muted">{label}</dt><dd className="mt-3 break-words text-3xl font-extrabold">{value}</dd>{label==='Returning visitors'&&<p className="mt-2 text-xs leading-6 text-muted">{report.returningVisitors} returning / {report.visitors} measured visitors</p>}</div>)}</dl>
   <section className="mt-7 rounded-xl border border-nausea/30 bg-nausea-soft p-5 sm:p-7"><h2 className="text-xl font-bold">Daily traffic meter</h2><p className="mt-2 text-sm text-muted">Today: <strong className="text-foreground">{report.days.at(-1)?.visitors??0} visitors</strong>. Bars show distinct measured visitors for each day. A dash means collection had not started.</p><ol className="mt-6 space-y-3">{report.days.map(day=><li key={day.date} title={day.available===false?"Before collection began":undefined} className="grid grid-cols-[4rem_1fr_2.5rem] items-center gap-3 text-xs sm:text-sm"><time dateTime={day.date}>{day.date.slice(5)}</time><div className="h-5 overflow-hidden rounded bg-card-border"><div className="h-full rounded bg-nausea" style={{width:`${day.available===false?0:100*day.visitors/maximum}%`}} /></div><span className="text-right font-bold">{day.available===false?"?":day.visitors}</span></li>)}</ol></section>
   <section className="mt-7 rounded-xl border border-card-border bg-card p-5 sm:p-7"><h2 className="text-xl font-bold">What comeback percentage means</h2><p className="mt-3 text-sm leading-7 text-muted">A returning visitor is a recognized browser with activity in a later visit after at least 30 minutes of inactivity. The percentage is returning visitors divided by all distinct measured visitors active in this date range. One browser can become returning within the selected period. Refreshing pages within a visit does not count as coming back.</p><p className="mt-3 text-sm leading-7 text-muted">This measures browsers, not verified people. New devices, private browsing and cleared cookies can appear new. Opt-outs, tracking protection and known automated or admin traffic are excluded. Bot filtering is best effort. Daily visitor totals are not added together to calculate distinct visitors for the whole period.</p><p className="mt-3 text-xs leading-6 text-muted">Collection started: {report.collectionStarted?date(report.collectionStarted):'Not available'}. Earlier dates have no collected history. Report updated: {date(report.end)}.</p></section>
   {report.pageviews===0&&<p className="mt-5 text-sm leading-7 text-muted">No measured visits in this period yet. Collection begins with this release; historical traffic is not estimated.</p>}
  </div>}
 </div>;
}
