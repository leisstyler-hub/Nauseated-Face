import {officialResultTone} from '@/lib/inspection-history';
export function OfficialResultBadge({result}:{result:string|null|undefined}){
 const tone=officialResultTone(result);
 const color=tone==='critical'?'bg-critical-soft text-critical border-critical/40':tone==='good'?'bg-nausea-soft text-nausea border-nausea/40':'bg-card text-muted border-card-border';
 return <span className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs font-bold leading-5 ${color}`}>{result?.trim()||'Result not recorded'}</span>;
}
