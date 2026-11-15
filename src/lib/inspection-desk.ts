import {getHomeArea} from '@/lib/home-area';
import type {DeskReport} from '@/components/CategoryReport';
import {openSiteStore,savedStorageEnabled} from '../../backend/production.mjs';
import {buildInspectionDesk,deskStrategy,pacificDate} from '../../backend/inspection-desk.mjs';
import {JURISDICTIONS} from '../../backend/jurisdictions.mjs';
export async function loadInspectionDesk(offset=0){
 const area=await getHomeArea();
 let report:DeskReport={supported:false,categories:[],today:pacificDate()};
 let unavailable=false;
 const strategy=deskStrategy(JURISDICTIONS.find(j=>j.id===area.jurisdictionId));
 if(area.selected&&strategy&&area.covered&&savedStorageEnabled()){
  const store=openSiteStore();
  try{
   const today=pacificDate();const since=`${Number(today.slice(0,4))-2}${today.slice(4)}`;
   report=buildInspectionDesk(await store.inspectionDeskHistory({...area,since}),{strategy,today,offset}) as DeskReport;
  }catch(error){console.error('Inspection Desk read failed',error instanceof Error?error.name:'Unknown error');unavailable=true;}
  finally{await store.close();}
 }else if(strategy){unavailable=true;}
 return {area,report,unavailable};
}
