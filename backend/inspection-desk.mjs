import {stateSlug} from './jurisdictions.mjs';
const DAY=86400000;
export const deskStrategy=jurisdiction=>jurisdiction?.id==='wa-king'&&jurisdiction.scoring?.type==='violation_points'&&jurisdiction.scoring?.direction==='lower_is_better'?'king_county_points':null;
export const pacificDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const day=date=>String(date??'').slice(0,10);
const shift=(date,days)=>new Date(Date.parse(date+'T12:00:00Z')+days*DAY).toISOString().slice(0,10);
const number=value=>value===null||value===undefined||String(value).trim()===''?null:(Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null);
const routine=e=>e.fields?.inspection_type==='Routine Inspection/Field Review';
const dateOrder=(a,b)=>b.date.localeCompare(a.date)||String(a.id??'').localeCompare(String(b.id??''));
const codes=e=>new Set(e.violations.map(v=>String(v.description??'').match(/^\s*(\d+)\s*-/)?.[1]).filter(Boolean));
const red=e=>new Set(e.violations.filter(v=>String(v.type).toUpperCase()==='RED').map(v=>String(v.description))).size;
const count=e=>new Set(e.violations.filter(v=>v.description).map(v=>String(v.description))).size;
const tie=(a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id);
/** @param {Array<object>} businesses @param {{strategy?:string|null,today?:string}} options */
export function buildInspectionDesk(businesses,{strategy=null,today=pacificDate()}={}){
 if(strategy!=='king_county_points')return {supported:false,categories:[],today};
 const first=today.slice(0,7)+'-01', monthEnd=shift(first,-1),monthStart=monthEnd.slice(0,7)+'-01';
 const start=shift(today,-29),historyStart=`${Number(today.slice(0,4))-2}${today.slice(4)}`,recentStart=`${Number(today.slice(0,4))-1}${today.slice(4)}`;
 const lists={monthly:[],red:[],repeats:[],closures:[],violations:[],comebacks:[],clean:[]};
 for(const b of businesses){
  const base={id:b.id,name:b.name,city:b.city,href:`/restaurants/${stateSlug(b.stateCode==='WA'?'Washington':b.stateCode)}/${b.slug}`};
  const events=b.events.map(e=>({...e,date:day(e.date),score:number(e.fields?.inspection_score),violations:e.violations??[]})).filter(e=>e.date>=historyStart&&e.date<=today).sort(dateOrder);
  // Two same-day events do not establish a longitudinal trend. Pick the most
  // conservative score on that day, retaining exact source inspections elsewhere.
  const dates=new Map();for(const e of events.filter(routine)){const prior=dates.get(e.date);if(!prior||(e.score??-1)>(prior.score??-1))dates.set(e.date,e);}
  const routines=[...dates.values()].sort(dateOrder),latest=routines[0],previous=routines[1];
  const monthly=routines.filter(e=>e.date>=monthStart&&e.date<=monthEnd);
  if(monthly.length){
   const scored=monthly.filter(e=>e.score!==null).sort((a,b)=>b.score-a.score||dateOrder(a,b))[0];
   if(scored)lists.monthly.push({...base,date:scored.date,score:scored.score,latestDate:latest?.date,latestScore:latest?.score});
   const most=[...monthly].sort((a,b)=>count(b)-count(a)||dateOrder(a,b))[0];
   if(count(most)>0)lists.violations.push({...base,date:most.date,count:count(most)});
  }
  const closure=events.find(e=>String(e.fields?.inspection_closed_business).toLowerCase()==='yes');
  if(closure)lists.closures.push({...base,date:closure.date,status:'Current status unverified'});
  if(!latest||latest.date<recentStart)continue;
  const trend=routines.slice(0,3);
  if(previous&&trend.some(e=>red(e)>0))lists.red.push({...base,date:latest.date,count:red(latest),previousCount:red(previous),history:trend.map(e=>({date:e.date,red:red(e)}))});
  if(previous){
   const old=codes(previous),repeated=[...codes(latest)].filter(c=>old.has(c));
   if(repeated.length)lists.repeats.push({...base,date:latest.date,previousDate:previous.date,count:repeated.length,codes:repeated});
   // Never skip an intervening missing-score routine event to manufacture a pair.
   if(latest.date>=start&&latest.score!==null&&previous.score!==null&&latest.score<previous.score)lists.comebacks.push({...base,date:latest.date,previousDate:previous.date,score:latest.score,previousScore:previous.score,change:previous.score-latest.score});
  }
  if(trend.length>=2&&trend.every(e=>e.score!==null))lists.clean.push({...base,date:latest.date,score:latest.score,mean:trend.reduce((n,e)=>n+e.score,0)/trend.length,max:Math.max(...trend.map(e=>e.score)),history:trend.map(e=>({date:e.date,score:e.score}))});
 }
 const historyPeriod=`${historyStart} to ${today}; newest routine inspection since ${recentStart}`;
 const definitions=[
 ['monthly','Monthly Hall of Shame',`${monthStart} to ${monthEnd}`,'Highest official points on a routine inspection in the previous completed month. One entry per business; later routine findings are shown for context.',20,(a,b)=>b.score-a.score||tie(a,b)],
 ['red','Red Violation Report',historyPeriod,'Latest up to three routine inspections, minimum two distinct dates. Critical-finding counts show direction, including improvements. Historical findings do not establish current conditions.',50,(a,b)=>b.count-a.count||tie(a,b)],
 ['repeats','Repeated Violations',historyPeriod,'The same official violation code on the latest two routine inspection dates. Recurrence does not establish that a problem remained uncorrected between visits.',50,(a,b)=>b.count-a.count||tie(a,b)],
 ['closures','Closed Kitchen Watch',`${historyStart} to ${today}`,'Closure recorded at a past inspection. Current closure or reopening status is not confirmed by this dataset. Check the authority updates before treating any business as closed.',50,(a,b)=>b.date.localeCompare(a.date)||tie(a,b)],
 ['violations','Most Violations',`${monthStart} to ${monthEnd}`,'Most distinct recorded violation items on a routine inspection in the previous completed month. One entry per business; counts are separate from weighted points.',20,(a,b)=>b.count-a.count||tie(a,b)],
 ['comebacks','Recent Comebacks',`${start} to ${today}`,'Largest point drops from the previous routine inspection to the latest routine inspection within these 30 days. Educational visits and targeted return inspections do not qualify.',10,(a,b)=>b.change-a.change||tie(a,b)],
 ['clean','Clean Plate Award',historyPeriod,'Lowest mean official points across the latest two or three routine inspections. Ties favor the lower maximum, then latest points. At least two distinct dates required. Historical performance is not a current-safety guarantee.',50,(a,b)=>a.mean-b.mean||a.max-b.max||a.score-b.score||tie(a,b)],
 ];
 return {supported:true,today,categories:definitions.map(([id,name,period,description,limit,sort])=>({id,name,period,description,limit,total:lists[id].length,items:lists[id].sort(sort).slice(0,limit)}))};
}
