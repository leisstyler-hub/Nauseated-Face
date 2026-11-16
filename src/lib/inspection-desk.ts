import {cacheLife,cacheTag} from 'next/cache';
import {getHomeArea} from '@/lib/home-area';
import type {DeskReport} from '@/components/CategoryReport';
import {openSiteStore,savedStorageEnabled} from '../../backend/production.mjs';
import {buildInspectionDesk,deskStrategy,pacificDate} from '../../backend/inspection-desk.mjs';
import {JURISDICTIONS} from '../../backend/jurisdictions.mjs';
async function cachedReport(jurisdictionId:string,stateCode:string,city:string,today:string,offset:number){
 'use cache: remote';
 cacheLife({stale:0,revalidate:60,expire:300});cacheTag('inspection-desk');
 const store=openSiteStore();
 try{return buildInspectionDesk(await store.inspectionDeskHistory({jurisdictionId,stateCode,city}),{strategy:'king_county_points',today,offset}) as DeskReport;}
 finally{await store.close();}
}
export async function loadInspectionDesk(offset=0){
 // Availability is intentionally checked outside the report cache on every
 // request. A disabled source never gets a cached report through this loader.
 const area=await getHomeArea(),today=pacificDate();
 let report:DeskReport={supported:false,categories:[],today};let unavailable=false;
 const strategy=deskStrategy(JURISDICTIONS.find(j=>j.id===area.jurisdictionId));
 if(area.selected&&strategy&&area.covered&&savedStorageEnabled()){
  try{report=await cachedReport(area.jurisdictionId,area.stateCode,area.city,today,offset);}
  catch(error){console.error('Inspection Desk read failed',error instanceof Error?error.name:'Unknown error');unavailable=true;}
 }else if(strategy){unavailable=true;}
 return {area,report,unavailable};
}

