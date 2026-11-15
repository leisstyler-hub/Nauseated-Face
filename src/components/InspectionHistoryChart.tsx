"use client";
import {useId,useState} from 'react';
import {historyPoints,officialResultTone,type HistoryInspection} from '@/lib/inspection-history';
import {OfficialResultBadge} from './OfficialResultBadge';
import {formatInspectionDate} from '@/lib/format';
export function InspectionHistoryChart({inspections,violationPoints}:{inspections:HistoryInspection[];violationPoints:boolean}){
 const rows=historyPoints(inspections);const [selected,setSelected]=useState(rows.at(-1)?.id??'');const labelId=useId();
 if(rows.length<2)return null;
 const active=rows.find(r=>r.id===selected)??rows[0];const dated=rows.filter(r=>r.time!==null);const scored=dated.filter(r=>r.score!==null);const numeric=violationPoints&&scored.length>0;
 const first=dated[0]?.time??0,last=dated.at(-1)?.time??first;const max=Math.max(10,...scored.map(r=>r.score!));const x=(time:number,width:number)=>48+(time-first)/Math.max(1,last-first)*(width-96);
 const color=(result:string|null)=>officialResultTone(result)==='critical'?'var(--critical)':officialResultTone(result)==='good'?'var(--nausea)':'var(--muted)';
 return <section aria-labelledby={labelId} className="mb-8 min-w-0 rounded-xl border border-card-border bg-card p-4 sm:p-6">
  <h2 id={labelId} className="text-xl font-bold">Inspection performance over time</h2>
  <p className="mt-2 text-sm leading-6 text-muted">{numeric&&<strong className="text-foreground">Lower violation points are better. </strong>}This chart shows past inspections, not the restaurant&apos;s current condition. Conditions may have changed since each visit.</p>
  {dated.length>0&&<>{[320,640].map(width=><span key={width}>{<svg viewBox={`0 0 ${width} 240`} role="group" aria-label={numeric?'Inspection points by date. Each point opens its full inspection report.':'Dated inspection results. Each point opens its full report.'} className={width===320?"mt-4 w-full sm:hidden":"mt-4 hidden w-full sm:block"}>
   {numeric?[0,max/2,max].map(value=><g key={value}><line x1="48" x2={width-48} y1={190-value/max*150} y2={190-value/max*150} stroke="var(--card-border)"/><text x="38" y={194-value/max*150} textAnchor="end" fill="var(--muted)" fontSize="12">{Math.round(value*10)/10}</text></g>):<line x1="48" x2={width-48} y1="110" y2="110" stroke="var(--card-border)"/>}
   {dated.map(row=><a key={row.id} href={row.reportHref??`#inspection-${row.id}`} aria-label={`Open full inspection report for ${formatInspectionDate(row.date!)}; ${row.result??'result not recorded'}; ${row.score===null?'points not recorded':`${row.score} points`}`} className="chart-report-point" onFocus={()=>setSelected(row.id)}>
    <title>{`${formatInspectionDate(row.date!)}: ${row.result??'Result not recorded'}; ${row.score===null?'points not recorded':`${row.score} points`}. Open full report.`}</title>
    <circle cx={x(row.time!,width)} cy={numeric&&row.score!==null?190-row.score/max*150:numeric?212:110} r="14" fill="transparent"/>
    <circle cx={x(row.time!,width)} cy={numeric&&row.score!==null?190-row.score/max*150:numeric?212:110} r={row.id===active.id?7:5} fill={color(row.result)} stroke={row.id===active.id?'var(--foreground)':'var(--background)'} strokeWidth="2" pointerEvents="none"/>
   </a>)}
   <text x="48" y="237" fill="var(--muted)" fontSize="12">{formatInspectionDate(dated[0].date!)}</text><text x={width-48} y="237" textAnchor="end" fill="var(--muted)" fontSize="12">{formatInspectionDate(dated.at(-1)!.date!)}</text>
  </svg>}</span>)}{numeric&&dated.some(r=>r.score===null)&&<p className="mt-2 text-xs text-muted">Dots below the scale have no recorded points; they are not zero.</p>}</>}
  <p className="my-3 text-xs leading-6 text-muted">{numeric?'Click or tap a dot to open its full inspection report. ':'Official results by date; no comparable points series is available. '}Green: satisfactory. Red: unsatisfactory. Gray: other or unrecorded result. {rows.filter(r=>r.date===null).length>0&&'Undated records remain in the selector and timeline.'}</p>
  <label className="block text-sm font-semibold">Explore an inspection<select value={active.id} onChange={e=>setSelected(e.target.value)} className="mt-2 block w-full min-w-0 rounded-lg border border-card-border bg-background p-2 text-sm">{rows.map(row=><option key={row.id} value={row.id}>{`${row.date?formatInspectionDate(row.date):'Date not recorded'} - ${row.result??'Result not recorded'}${violationPoints&&row.score!==null?` - ${row.score} points`:''}`}</option>)}</select></label>
  <div aria-live="polite" className="mt-4 flex flex-wrap items-center gap-3 text-sm"><OfficialResultBadge result={active.result}/><span>{violationPoints?(active.score===null?'Points not recorded':`${active.score} violation points`):active.type}</span><a href={active.reportHref??`#inspection-${active.id}`} className="font-semibold text-nausea underline">Open full inspection report</a></div>
 </section>;
}
