import {citySlug,stateSlug} from './jurisdictions.mjs';
import {cityCenter} from './city-centers.mjs';
import {WA_PLACES} from './wa-places.mjs';
// Browsing aliases only. Native city fields and inspection records stay untouched.
const WA_ALIASES={'sea-tac':'seatac','vashon-island':'vashon','west-seattle':'seattle'};
export function canonicalCityKey(stateCode,name){const key=citySlug(String(name??'').trim());return (!stateCode||stateCode.toUpperCase()==='WA')?(WA_ALIASES[key]??key):key;}
export function cityKeySql(column,stateColumn='state_code'){
 const key=`trim(both '-' from regexp_replace(lower(trim(${column})), '[^a-z0-9]+', '-', 'g'))`;
 return `(CASE WHEN ${stateColumn}='WA' AND ${key}='sea-tac' THEN 'seatac' WHEN ${stateColumn}='WA' AND ${key}='vashon-island' THEN 'vashon' WHEN ${stateColumn}='WA' AND ${key}='west-seattle' THEN 'seattle' ELSE ${key} END)`;
}
const dateMin=(a,b)=>!a?b:!b?a:a<b?a:b;
const dateMax=(a,b)=>!a?b:!b?a:a>b?a:b;
export function buildLocationCatalog(registry,covered,catalog){
 const states=new Map();
 for(const j of registry){
  const state=states.get(j.stateCode)??{code:j.stateCode,name:j.stateName,slug:stateSlug(j.stateName),cities:[]};
  const runtime=catalog.find(entry=>entry.id===j.id);
  const entries=new Map(j.cities.map(name=>{const key=canonicalCityKey(j.stateCode,name);return [key,{name:j.stateCode==='WA'?(WA_PLACES[key]??name):name,records:[]}];}));
  for(const row of covered.filter(c=>c.jurisdictionId===j.id)){
   const key=canonicalCityKey(j.stateCode,row.city);if(!key)continue;
   // Do not turn a typo or ambiguous address locality into a public city.
   // Such records remain intact and searchable in their source/region.
   if(j.stateCode==='WA'&&!WA_PLACES[key]&&!entries.has(key))continue;
   const entry=entries.get(key)??{name:j.stateCode==='WA'?WA_PLACES[key]:String(row.city).trim().replace(/\s+/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()),records:[]};
   entry.records.push(row);entries.set(key,entry);
  }
  for(const [slug,entry] of entries){
   const establishmentCount=entry.records.reduce((n,r)=>n+Number(r.establishmentCount??0),0);
   const inspectionCount=entry.records.reduce((n,r)=>n+Number(r.inspectionCount??0),0);
   const hasRecords=Boolean(runtime?.enabled&&establishmentCount>0);
   const recorded=entry.records.find(r=>r.latitude!==null&&r.longitude!==null);
   const point=recorded??cityCenter(j.stateCode,entry.name);
   const item={name:entry.name,slug,status:hasRecords?(runtime?.coverageStatus==='available'?'available':'limited'):(['limited','available'].includes(j.coverageStatus)?'coming_soon':j.coverageStatus),jurisdictionId:j.id,jurisdictionName:j.name,healthAuthority:j.healthAuthority,sourceUrl:j.sourceUrl,covered:hasRecords,latitude:point?.latitude??null,longitude:point?.longitude??null,establishmentCount:hasRecords?establishmentCount:0,inspectionCount:hasRecords?inspectionCount:0,firstInspectionDate:hasRecords?entry.records.reduce((a,r)=>dateMin(a,r.firstInspectionDate??null),null):null,lastInspectionDate:hasRecords?entry.records.reduce((a,r)=>dateMax(a,r.lastInspectionDate??null),null):null,lastRefreshed:runtime?.lastSuccess??null};
   const previous=state.cities.findIndex(c=>c.slug===slug);
   if(previous<0)state.cities.push(item);else if(item.covered&&!state.cities[previous].covered)state.cities[previous]=item;
  }
  state.cities.sort((a,b)=>(state.code==='WA'?b.inspectionCount-a.inspectionCount:0)||a.name.localeCompare(b.name));states.set(j.stateCode,state);
 }
 return [...states.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
