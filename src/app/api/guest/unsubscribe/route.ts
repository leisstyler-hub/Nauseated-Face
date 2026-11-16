import {getAdminAuth} from '../../../../../backend/admin-auth.mjs';
import {readUnsubscribeToken} from '../../../../../backend/guest-watchdog.mjs';
import {GuestStore} from '../../../../../backend/guests.mjs';
import {productionEnabled} from '../../../../../backend/production.mjs';
const headers={'Cache-Control':'no-store','Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; form-action 'self'; base-uri 'none'",'Referrer-Policy':'no-referrer'};
export async function GET(request:Request){
 const token=new URL(request.url).searchParams.get('token')??'';
 if(!readUnsubscribeToken(token,process.env.NF_GUEST_MAIL_SECRET))return new Response('Invalid unsubscribe link.',{status:400,headers});
 // Tokens contain base64url and hex only; GET deliberately does not change preferences.
 return new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stop Watchdog email</title><h1>Stop Watchdog email?</h1><p>Your watched restaurants remain saved in your account.</p><form method="post"><input type="hidden" name="token" value="${token}"><button type="submit">Stop Watchdog email</button></form></html>`,{headers});
}
export async function POST(request:Request){
 try{
  const url=new URL(request.url),raw=await request.text();if(raw.length>2048)throw Error('Invalid request');
  const token=url.searchParams.get('token')??new URLSearchParams(raw).get('token');
  const user=readUnsubscribeToken(token,process.env.NF_GUEST_MAIL_SECRET);if(!user)return new Response('Invalid unsubscribe link.',{status:400,headers});
  const auth=getAdminAuth();if(!auth)throw Error('Unavailable');
  await new GuestStore(auth.options.database,productionEnabled()?'nf_production':'nf_preview').query('UPDATE nf_guests.profiles SET email_alerts=false,updated_at=now() WHERE user_id=$1',[user]);
  return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email stopped</title><h1>Watchdog email is off</h1><p>You can still view your watched restaurants in your account.</p></html>',{headers});
 }catch{return new Response('Unable to update email preferences. Please retry.',{status:503,headers});}
}
