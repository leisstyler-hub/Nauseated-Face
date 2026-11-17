import {getAdminAuth,ownerSession} from '../../../../../backend/admin-auth.mjs';
import {guestRequest} from '../../../../../backend/guests.mjs';
import {guestStore,guestUnavailable} from '@/lib/guests';
async function handle(request:Request){
 try{
  const session=await ownerSession(getAdminAuth(),request.headers);
  if(!session)return Response.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
  // The owner gate above is mandatory; guest identity alone never authorizes moderation.
  return await guestRequest(request,{user:{...session.user,emailVerified:true}},async(actor:string,body:Record<string,unknown>)=>{
   const store=guestStore();
   if(request.method==='GET')return store.queue(Number(new URL(request.url).searchParams.get('offset')??0));
   await store.rate('moderator:'+actor);return store.moderate(actor,body);
  });
 }catch{return guestUnavailable();}
}
export const GET=handle;export const POST=handle;
