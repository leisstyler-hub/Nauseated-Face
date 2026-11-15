import {getHomeArea} from '@/lib/home-area';
import {CategoryGrid, type DeskReport} from './CategoryGrid';
import {openSiteStore,savedStorageEnabled} from '../../backend/production.mjs';
import {buildInspectionDesk,deskStrategy,pacificDate} from '../../backend/inspection-desk.mjs';
import {JURISDICTIONS} from '../../backend/jurisdictions.mjs';
export async function InspectionDeskSection(){
 const area=await getHomeArea();
 if(!area.selected)return null;
 let report:DeskReport={supported:false,categories:[],today:pacificDate()};
 let unavailable=false;
 const strategy=deskStrategy(JURISDICTIONS.find(j=>j.id===area.jurisdictionId));
 if(strategy&&area.covered&&savedStorageEnabled()){
  const store=openSiteStore();
  try{
   const today=pacificDate();
   const since=`${Number(today.slice(0,4))-2}${today.slice(4)}`;
   const history=await store.inspectionDeskHistory({...area,since});
   report=buildInspectionDesk(history,{strategy,today}) as DeskReport;
  }catch(error){console.error('Inspection Desk read failed',error instanceof Error?error.name:'Unknown error');unavailable=true;}
  finally{await store.close();}
 }else if(strategy){unavailable=true;}
 return <CategoryGrid key={area.key} report={report} areaLabel={area.label} region={area.jurisdictionId==='wa-king'&&area.city?{key:'washington/greater-seattle',label:'Greater Seattle'}:null} unavailable={unavailable}/>;
}
