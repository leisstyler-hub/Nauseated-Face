import { getAdminAuth,ownerSession } from '../../../../../backend/admin-auth.mjs';
import { trafficReport } from '../../../../../backend/traffic.mjs';
export async function GET(request){
 const headers={'Cache-Control':'no-store'};
 try{
  const auth=getAdminAuth();
  if(!await ownerSession(auth,request.headers))return Response.json({error:'Unauthorized'},{status:401,headers});
  const range=new URL(request.url).searchParams.get('range')??'7';
  if(!['today','3','7','30','month'].includes(range))return Response.json({error:'Invalid traffic range'},{status:400,headers});
  return Response.json(await trafficReport(auth.options.database,range),{headers});
 }catch{return Response.json({error:'Traffic reporting unavailable. No estimated counts are substituted.'},{status:503,headers});}
}
