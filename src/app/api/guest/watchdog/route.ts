import {timingSafeEqual} from 'node:crypto';
import {guestStore,guestUnavailable} from '@/lib/guests';
import {deliverWatchdog,emailReady,sendWatchdog} from '../../../../../backend/guest-watchdog.mjs';
export const maxDuration=300;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET??'',given=request.headers.get('authorization')??'',expected='Bearer '+secret;
 if(secret.length<32||given.length!==expected.length||!timingSafeEqual(Buffer.from(given),Buffer.from(expected)))return Response.json({error:'Unauthorized'},{status:401});
 if(!emailReady())return guestUnavailable();
 try{return Response.json(await deliverWatchdog(guestStore(),sendWatchdog,{origin:'https://www.nauseated-face.app',secret:process.env.NF_GUEST_MAIL_SECRET}),{headers:{'Cache-Control':'no-store'}});}catch{return guestUnavailable();}
}
