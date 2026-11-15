import {loadInspectionDesk} from '@/components/InspectionDeskSection';
export async function GET(request:Request){
 const url=new URL(request.url),category=url.searchParams.get('category'),offset=Number(url.searchParams.get('offset'));
 if(!['monthly','red','repeats','closures','violations'].includes(category??'')||!Number.isSafeInteger(offset)||offset<0||offset>100000)return Response.json({error:'Invalid category page'},{status:400});
 const {area,report,unavailable}=await loadInspectionDesk(offset);
 if(unavailable)return Response.json({error:'Saved history temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 const page=report.categories.find(c=>c.id===category);
 if(!area.selected||!page)return Response.json({error:'Select a supported location'},{status:400});
 return Response.json({areaKey:area.key,page},{headers:{'Cache-Control':'private, no-store'}});
}
