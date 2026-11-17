import {openSiteStore,savedStorageEnabled} from '../../../../backend/production.mjs';
import {sourceExportResponse} from '../../../../backend/source-export.mjs';
export const maxDuration=300;
export async function GET(request){
 if(!savedStorageEnabled())return Response.json({error:'Saved data unavailable'},{status:503});
 const store=openSiteStore();
 try{return await sourceExportResponse(store,new URL(request.url).searchParams.get('jurisdiction'));}
 catch{await store.close();return Response.json({error:'Source export unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
