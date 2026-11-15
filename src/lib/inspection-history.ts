export function officialResultTone(result:string|null|undefined):'critical'|'good'|'neutral'{
 const value=result?.trim().toLowerCase();
 return value==='unsatisfactory'?'critical':value==='satisfactory'?'good':'neutral';
}
export interface HistoryInspection {id:string;inspectionDate:string|null;fields:Record<string,string>}
export function historyPoints(inspections:HistoryInspection[]){
 return inspections.map(i=>{const raw=i.fields.inspection_score?.trim();const n=raw?Number(raw):NaN;const time=i.inspectionDate?Date.parse(i.inspectionDate):NaN;return {id:i.id,date:Number.isFinite(time)?i.inspectionDate:null,time:Number.isFinite(time)?time:null,score:Number.isFinite(n)&&n>=0?n:null,result:i.fields.inspection_result??null,type:i.fields.inspection_type??null};}).sort((a,b)=>(a.time??Infinity)-(b.time??Infinity)||a.id.localeCompare(b.id));
}
