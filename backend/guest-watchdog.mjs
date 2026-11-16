import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {GuestStore} from './guests.mjs';

export const emailReady=(env=process.env)=>env.NF_WATCHDOG_EMAIL_ENABLED==='yes'&&!!env.RESEND_API_KEY&&!!env.NF_GUEST_EMAIL_FROM&&(env.NF_GUEST_MAIL_SECRET?.length??0)>=32;
export function unsubscribeToken(user,secret){if(secret.length<32)throw Error('Mail secret required');const id=Buffer.from(user).toString('base64url');return id+'.'+createHmac('sha256',secret).update('guest-unsubscribe:'+id).digest('hex');}
export function readUnsubscribeToken(value,secret){
 if(!secret||secret.length<32||typeof value!=='string'||value.length>1500)return null;
 const [id,sig,...extra]=value.split('.');if(extra.length||!id||!/^[a-f0-9]{64}$/.test(sig??''))return null;
 const user=Buffer.from(id,'base64url').toString();if(!user)return null;
 const expected=unsubscribeToken(user,secret);return expected.length===value.length&&timingSafeEqual(Buffer.from(expected),Buffer.from(value))?user:null;
}
export async function sendWatchdog(message,env=process.env,fetcher=fetch){
 if(!emailReady(env))throw Error('Watchdog email is not configured');
 const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'nf-watchdog/'+message.id},body:JSON.stringify({from:env.NF_GUEST_EMAIL_FROM,to:[message.to],subject:'Your watched restaurant has a newer saved inspection',text:message.text,headers:{'List-Unsubscribe':`<${message.unsubscribe}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Watchdog email provider did not accept delivery');
 const result=await response.json();if(!result.id)throw Error('Watchdog email acceptance unavailable');
}
export async function deliverWatchdog(store,send,{origin,secret}){
 const url=new URL(origin);if(url.protocol!=='https:')throw Error('HTTPS mail origin required');
 const client=store.db.connect?await store.db.connect():store.db;
 const locked=new GuestStore(client,store.schema);let held=false;
 try{
  const [lock]=await locked.query('SELECT pg_try_advisory_lock(78623581) AS locked');if(!lock.locked)return {busy:true,sent:0};held=true;
  const candidates=await locked.query(`WITH candidates AS(SELECT s.user_id,s.jurisdiction_id,s.official_id,p.email,e.name,e.slug,e.state_code,s.created_at,
   (SELECT i.id FROM nf_production.inspections i WHERE i.establishment_id=e.id ORDER BY i.inspection_date DESC NULLS LAST,i.id DESC LIMIT 1) AS inspection_key
   FROM nf_guests.saved s JOIN nf_guests.profiles p ON p.user_id=s.user_id JOIN nf_production.establishments e ON e.jurisdiction_id=s.jurisdiction_id AND e.official_id=s.official_id
   JOIN nf_production.jurisdictions j ON j.id=e.jurisdiction_id WHERE s.watch AND p.email_alerts AND p.email IS NOT NULL AND j.enabled AND j.coverage_status IN ('available','limited')
   AND s.email_key IS DISTINCT FROM (SELECT i.id FROM nf_production.inspections i WHERE i.establishment_id=e.id ORDER BY i.inspection_date DESC NULLS LAST,i.id DESC LIMIT 1)
   ) SELECT c.*,m.last_attempt_at FROM candidates c LEFT JOIN nf_guests.mail m ON m.user_id=c.user_id AND m.jurisdiction_id=c.jurisdiction_id AND m.official_id=c.official_id AND m.inspection_key=c.inspection_key
   WHERE m.status IS NULL OR m.status NOT IN ('cancelled','uncertain')
   ORDER BY m.last_attempt_at NULLS FIRST,c.created_at,c.user_id,c.jurisdiction_id,c.official_id LIMIT 50`);
  let sent=0,uncertain=0,failed=0;
  for(const row of candidates){
   if(!row.inspection_key)continue;
   const keys=[row.user_id,row.jurisdiction_id,row.official_id,row.inspection_key];
   const unsubscribe=url.origin+'/api/guest/unsubscribe?token='+encodeURIComponent(unsubscribeToken(row.user_id,secret));
   const payload={to:row.email,unsubscribe,text:`${row.name} has a different latest saved inspection record. Read the official record and its historical context:\n${url.origin}/restaurants/${encodeURIComponent(row.state_code.toLowerCase())}/${encodeURIComponent(row.slug)}\n\nThese historical findings do not establish current safety.\nManage your preferences: ${url.origin}/account\nStop Watchdog email: ${unsubscribe}`};
   await locked.query('INSERT INTO nf_guests.mail(id,user_id,jurisdiction_id,official_id,inspection_key,payload) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,jurisdiction_id,official_id,inspection_key) DO NOTHING',[randomUUID(),...keys,JSON.stringify(payload)]);
   const [mail]=await locked.query('SELECT id,status,payload,first_attempt_at FROM nf_guests.mail WHERE user_id=$1 AND jurisdiction_id=$2 AND official_id=$3 AND inspection_key=$4',keys);
   if(mail.status==='sent'){await locked.query('UPDATE nf_guests.saved SET email_key=$4 WHERE user_id=$1 AND jurisdiction_id=$2 AND official_id=$3',keys);continue;}
   if(mail.status!=='pending')continue;
   // Do not automatically retry an ambiguous send outside the provider's 24h key window.
   if(mail.first_attempt_at&&Date.now()-new Date(mail.first_attempt_at).getTime()>23*3600000){await locked.query("UPDATE nf_guests.mail SET status='uncertain' WHERE id=$1",[mail.id]);uncertain++;continue;}
   const [still]=await locked.query(`SELECT p.email FROM nf_guests.profiles p JOIN nf_guests.saved s ON s.user_id=p.user_id JOIN nf_production.jurisdictions j ON j.id=s.jurisdiction_id WHERE p.user_id=$1 AND s.jurisdiction_id=$2 AND s.official_id=$3 AND p.email_alerts AND s.watch AND j.enabled AND j.coverage_status IN ('available','limited')`,keys.slice(0,3));
   if(!still||still.email!==mail.payload.to){await locked.query("UPDATE nf_guests.mail SET status='cancelled' WHERE id=$1",[mail.id]);continue;}
   await locked.query('UPDATE nf_guests.mail SET first_attempt_at=coalesce(first_attempt_at,now()),last_attempt_at=now() WHERE id=$1',[mail.id]);
   try{await send({id:mail.id,...mail.payload});}catch{failed++;continue;}
   await locked.query("UPDATE nf_guests.mail SET status='sent',sent_at=now() WHERE id=$1",[mail.id]);
   await locked.query('UPDATE nf_guests.saved SET email_key=$4 WHERE user_id=$1 AND jurisdiction_id=$2 AND official_id=$3',keys);sent++;
  }
  return {sent,uncertain,failed,limit:50};
 }finally{try{if(held)await locked.query('SELECT pg_advisory_unlock(78623581)');}finally{client.release?.();}}
}
