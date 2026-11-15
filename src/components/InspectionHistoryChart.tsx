"use client";
import {useId,useState} from 'react';
import {historyPoints,officialResultTone,type HistoryInspection} from '@/lib/inspection-history';
import {OfficialResultBadge} from './OfficialResultBadge';
import {formatInspectionDate} from '@/lib/format';
export function InspectionHistoryChart({inspections,violationPoints}:{inspections:HistoryInspection[];violationPoints:boolean}){
 const rows=historyPoints(inspections);const [selected,setSelected]=useState(rows.at(-1)?.id??'');const labelId=useId();
 if(rows.length<2)return null;
 const active=rows.find(r=>r.id===selected)??rows[0];const dated=rows.filter(r=>r.time!==null);const scored=dated.filter(r=>r.score!==null);const numeric=violationPoints&&scored.length>0;
 const first=dated[0]?.time??0,last=dated.at(-1)?.time??first;const max=Math.max(10,...scored.map(r=>r.score!));const x=(time:number)=>48+(time-first)/Math.max(1,last-first)*544;
 const color=(result:string|null)=>officialResultTone(result)==='critical'?'var(--critical)':officialResultTone(result)==='good'?'var(--nausea)':'var(--muted)';
 return <section aria-labelledby={labelId} className="mb-8 min-w-0 rounded-xl border border-card-border bg-card p-4 sm:p-6">
  <h2 id={labelId} className="text-xl font-bold">Inspection performance over time</h2>
  <p className="mt-2 text-sm leading-6 text-muted">{numeric?'Official violation points: lower is better. Each dot is an inspection, not a measurement between visits.':'Official results by inspection date. No comparable points series is available.'} Historical findings do not establish current safety.</p>
  {dated.length>0&&<><svg viewBox="0 0 640 240" role="img" aria-label={numeric?'Inspection points by date. Select an inspection below for its exact result.':'Dated inspection results. Select an inspection below for details.'} className="mt-4 w-full">
   {numeric?[0,max/2,max].map(value=><g key={value}><line x1="48" x2="592" y1={190-value/max*150} y2={190-value/max*150} stroke="var(--card-border)"/><text x="38" y={194-value/max*150} textAnchor="end" fill="var(--muted)" fontSize="12">{Math.round(value*10)/10}</text></g>):<line x1="48" x2="592" y1="110" y2="110" stroke="var(--card-border)"/>}
   {dated.map(row=><circle key={row.id} cx={x(row.time!)} cy={numeric&&row.score!==null?190-row.score/max*150:numeric?212:110} r={row.id===active.id?7:5} fill={color(row.result)} stroke={row.id===active.id?'var(--foreground)':'var(--background)'} strokeWidth="2" onClick={()=>setSelected(row.id)} className="cursor-pointer"><title>{formatInspectionDate(row.date!)}: {row.result??'Result not recorded'}; {row.score===null?'points not recorded':`${row.score} points`}</title></circle>)}
   <text x="48" y="237" fill="var(--muted)" fontSize="12">{formatInspectionDate(dated[0].date!)}</text><text x="592" y="237" textAnchor="end" fill="var(--muted)" fontSize="12">{formatInspectionDate(dated.at(-1)!.date!)}</text>
  </svg>{numeric&&dated.some(r=>r.score===null)&&<p className="mt-2 text-xs text-muted">Dots below the scale have no recorded points; they are not zero.</p>}</>}
  <p className="my-3 text-xs leading-6 text-muted">Green: satisfactory. Red: unsatisfactory. Gray: other or unrecorded result. {rows.filter(r=>r.date===null).length>0&&'Undated records remain in the selector and timeline.'}</p>
  <label className="block text-sm font-semibold">Explore an inspection<select value={active.id} onChange={e=>setSelected(e.target.value)} className="mt-2 block w-full min-w-0 rounded-lg border border-card-border bg-background p-2 text-sm">{rows.map(row=><option key={row.id} value={row.id}>{row.date?formatInspectionDate(row.date):'Date not recorded'} - {row.result??'Result not recorded'}{violationPoints&&row.score!==null?` - ${row.score} points`:''}</option>)}</select></label>
  <div aria-live="polite" className="mt-4 flex flex-wrap items-center gap-3 text-sm"><OfficialResultBadge result={active.result}/><span>{violationPoints?(active.score===null?'Points not recorded':`${active.score} violation points`):active.type}</span><a href={`#inspection-${active.id}`} className="font-semibold text-nausea underline">View this inspection</a></div>
 </section>;
}
