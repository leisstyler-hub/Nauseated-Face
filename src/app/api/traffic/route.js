import { getAdminAuth } from '../../../../backend/admin-auth.mjs';
import { recordPageView,trafficRequest } from '../../../../backend/traffic.mjs';
export async function POST(request){
 try{
  const auth=getAdminAuth();
  return trafficRequest(request,process.env.BETTER_AUTH_SECRET,event=>recordPageView(auth.options.database,event));
 }catch{return Response.json({error:'Traffic collection unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
export async function DELETE(request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
 return new Response(null,{status:204,headers:{'Cache-Control':'no-store','Set-Cookie':`nf-visitor=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${new URL(request.url).protocol==='https:'?'; Secure':''}`}});
}
