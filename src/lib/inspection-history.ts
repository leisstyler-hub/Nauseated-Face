export function officialResultTone(result:string|null|undefined):'critical'|'good'|'neutral'{
 const value=result?.trim().toLowerCase();
 return value==='unsatisfactory'?'critical':value==='satisfactory'?'good':'neutral';
}
export interface HistoryInspection {id:string;reportHref?:string|null;inspectionDate:string|null;fields:Record<string,string>}
export function historyPoints(inspections:HistoryInspection[]){
 return inspections.map(i=>{const raw=i.fields.inspection_score?.trim();const n=raw?Number(raw):NaN;const time=i.inspectionDate?Date.parse(/^\d{4}-\d{2}-\d{2}(?:T[\d:.]+)?$/.test(i.inspectionDate)?`${i.inspectionDate.slice(0,10)}T00:00:00Z`:i.inspectionDate):NaN;return {id:i.id,reportHref:i.reportHref??null,date:Number.isFinite(time)?i.inspectionDate:null,time:Number.isFinite(time)?time:null,score:Number.isFinite(n)&&n>=0?n:null,result:i.fields.inspection_result??null,type:i.fields.inspection_type??null};}).sort((a,b)=>(a.time??Infinity)-(b.time??Infinity)||a.id.localeCompare(b.id));
}
