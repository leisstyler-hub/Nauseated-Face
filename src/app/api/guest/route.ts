import {guestSession,guestStore,guestsEnabled,googleReady,guestUnavailable} from '@/lib/guests';
import {guestRequest} from '../../../../backend/guests.mjs';
import {emailReady} from '../../../../backend/guest-watchdog.mjs';

export async function GET(request:Request){
 if(!guestsEnabled())return guestUnavailable();
 try{
  const session=await guestSession();
  return await guestRequest(request,session,async(user:string)=>{
   const url=new URL(request.url),store=guestStore();
   if(url.searchParams.get('view')==='business')return {...await store.businessState(user,{jurisdictionId:url.searchParams.get('jurisdictionId'),officialId:url.searchParams.get('officialId')}),signedIn:true};
   return {...await store.dashboard(user,Number(url.searchParams.get('offset')??0)),signedIn:true,googleReady:googleReady(),emailDeliveryReady:emailReady()};
  });
 }catch{return guestUnavailable();}
}
export async function POST(request:Request){
 if(!guestsEnabled())return guestUnavailable();
 try{const session=await guestSession();return await guestRequest(request,session,async(user:string,body:Record<string,unknown>)=>{
  const store=guestStore();await store.rate(user);
  switch(body.action){
   case 'profile':return store.profile(user,body,session?.user?.email??null);
   case 'save':return store.save(user,body);
   case 'remove':return store.unsave(user,body);
   case 'seen':return store.seen(user,body);
   case 'review':return store.review(user,body);
   case 'deleteReview':return store.deleteReview(user,body.id);
   case 'report':return store.report(user,body);
   default:throw Object.assign(new Error('Invalid guest action'),{status:400});
  }
 });}catch{return guestUnavailable();}
}
