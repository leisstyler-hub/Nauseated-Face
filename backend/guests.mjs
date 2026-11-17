import {randomUUID} from 'node:crypto';

export const GUEST_SCHEMA=`CREATE SCHEMA IF NOT EXISTS nf_guests;
CREATE TABLE IF NOT EXISTS nf_guests.profiles(user_id text PRIMARY KEY,display_name text NOT NULL,email text,home_city text NOT NULL DEFAULT '',sort text NOT NULL DEFAULT 'date' CHECK(sort IN ('date','name','result')),email_alerts boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS nf_guests.saved(user_id text REFERENCES nf_guests.profiles(user_id) ON DELETE CASCADE,jurisdiction_id text NOT NULL,official_id text NOT NULL,favorite boolean NOT NULL DEFAULT false,watch boolean NOT NULL DEFAULT false,seen_key text,email_key text,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,jurisdiction_id,official_id));
CREATE TABLE IF NOT EXISTS nf_guests.reviews(id text PRIMARY KEY,user_id text NOT NULL REFERENCES nf_guests.profiles(user_id) ON DELETE CASCADE,jurisdiction_id text NOT NULL,official_id text NOT NULL,display_name text NOT NULL,rating int NOT NULL CHECK(rating BETWEEN 1 AND 5),body text NOT NULL CHECK(length(body) BETWEEN 10 AND 3000),status text NOT NULL CHECK(status IN ('pending','approved','rejected','deleted')),version int NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,jurisdiction_id,official_id));
CREATE INDEX IF NOT EXISTS guest_reviews_business ON nf_guests.reviews(jurisdiction_id,official_id,status,created_at DESC,id);
CREATE TABLE IF NOT EXISTS nf_guests.review_audit(id text PRIMARY KEY,review_id text NOT NULL,actor_id text NOT NULL,action text NOT NULL,snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS nf_guests.reports(id text PRIMARY KEY,review_id text NOT NULL REFERENCES nf_guests.reviews(id) ON DELETE CASCADE,user_id text NOT NULL,reason text NOT NULL,resolved boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(review_id,user_id));
CREATE TABLE IF NOT EXISTS nf_guests.rate_limits(user_id text PRIMARY KEY,window_at timestamptz NOT NULL,hits int NOT NULL);
CREATE TABLE IF NOT EXISTS nf_guests.mail(id text PRIMARY KEY,user_id text NOT NULL,jurisdiction_id text NOT NULL,official_id text NOT NULL,inspection_key text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','cancelled','uncertain')),payload jsonb,first_attempt_at timestamptz,last_attempt_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,UNIQUE(user_id,jurisdiction_id,official_id,inspection_key));`.replaceAll('nf_guests','nf_guests_production');

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const clean=(value,max)=>typeof value==='string'&&value.trim().length<=max&&!/[\u0000-\u001f\u007f]/.test(value)?value.trim():null;
const businessKey=b=>{
 if(!b||!clean(b.jurisdictionId,80)||!clean(b.officialId,300))fail('Invalid business');
 return [b.jurisdictionId,b.officialId];
};
const pagination=offset=>{if(!Number.isInteger(offset)||offset<0||offset>10000)fail('Invalid page');return offset;};
export const guestIdentity=session=>session?.user?.id&&session.user.emailVerified===true?session.user.id:null;

export async function guestRequest(request,session,apply){
 const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 const user=guestIdentity(session);if(!user)return reply(401,{error:'Sign in with a verified account to continue.'});
 if(request.method!=='GET'&&request.headers.get('origin')!==new URL(request.url).origin)return reply(403,{error:'Invalid request origin'});
 try{
  let body={};
  if(request.method!=='GET'){
   if(!request.headers.get('content-type')?.startsWith('application/json')||Number(request.headers.get('content-length')??0)>12000)return reply(400,{error:'Invalid request'});
   const raw=await request.text();if(Buffer.byteLength(raw)>12000)return reply(400,{error:'Request too large'});
   try{body=JSON.parse(raw);}catch{return reply(400,{error:'Invalid JSON'});}
   if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{error:'Invalid request'});
  }
  return reply(200,await apply(user,body));
 }catch(error){return reply([400,404,409,429].includes(error.status)?error.status:503,{error:[400,404,409,429].includes(error.status)?error.message:'Guest service temporarily unavailable. Please retry.'});}
}

export class GuestStore{
 constructor(db,schema='nf_production'){
  if(!['nf_production','nf_preview'].includes(schema))throw Error('Invalid source schema');
  this.db=db;this.schema=schema;
 }
 async query(sql,params=[]){return (await this.db.query(sql.replaceAll('nf_production.',this.schema+'.').replaceAll('nf_guests.',(this.schema==='nf_production'?'nf_guests_production.':'nf_guests_preview.')),params)).rows;}
 async rate(user){
  const rows=await this.query(`INSERT INTO nf_guests.rate_limits VALUES($1,now(),1) ON CONFLICT(user_id) DO UPDATE SET window_at=CASE WHEN nf_guests.rate_limits.window_at<now()-interval '1 minute' THEN now() ELSE nf_guests.rate_limits.window_at END,hits=CASE WHEN nf_guests.rate_limits.window_at<now()-interval '1 minute' THEN 1 ELSE nf_guests.rate_limits.hits+1 END WHERE nf_guests.rate_limits.hits<30 OR nf_guests.rate_limits.window_at<now()-interval '1 minute' RETURNING hits`,[user]);
  if(!rows.length)fail('Too many changes. Please wait a minute.',429);
 }
 async business(b){
  const [row]=await this.query(`SELECT e.id,e.jurisdiction_id,e.official_id,e.name,e.slug,e.state_code,e.city,e.latest_inspection_date,e.latest_result,e.latest_score,e.inspection_count,
   (SELECT i.id FROM nf_production.inspections i WHERE i.establishment_id=e.id ORDER BY i.inspection_date DESC NULLS LAST,i.id DESC LIMIT 1) AS inspection_key
   FROM nf_production.establishments e JOIN nf_production.jurisdictions j ON j.id=e.jurisdiction_id WHERE j.enabled AND j.coverage_status IN ('available','limited') AND e.jurisdiction_id=$1 AND e.official_id=$2`,businessKey(b));
  return row??null;
 }
 async requireBusiness(b){const row=await this.business(b);if(!row)fail('This business is not currently published.',404);return row;}
 /** @param {string|null} verifiedEmail */
 async profile(user,b,verifiedEmail=null){
  const name=clean(b.displayName,60),city=clean(b.homeCity,120);
  if(!name||city===null||!['date','name','result'].includes(b.sort)||typeof b.emailAlerts!=='boolean')fail('Invalid profile preferences');
  if(verifiedEmail!==null&&(typeof verifiedEmail!=='string'||verifiedEmail.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verifiedEmail)))fail('Verified email unavailable');
  await this.query(`INSERT INTO nf_guests.profiles(user_id,display_name,home_city,sort,email_alerts,email) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id) DO UPDATE SET display_name=$2,home_city=$3,sort=$4,email_alerts=$5,email=coalesce($6,nf_guests.profiles.email),updated_at=now()`,[user,name,city,b.sort,b.emailAlerts,verifiedEmail]);
  return {saved:true};
 }
 async requireProfile(user){const [row]=await this.query('SELECT display_name FROM nf_guests.profiles WHERE user_id=$1',[user]);if(!row)fail('Choose a public display name in your account first.');return row;}
 async save(user,b){
  if(typeof b.favorite!=='boolean'||typeof b.watch!=='boolean')fail('Invalid saved restaurant');
  const row=await this.requireBusiness(b);await this.requireProfile(user);
  await this.query(`INSERT INTO nf_guests.saved(user_id,jurisdiction_id,official_id,favorite,watch,seen_key,email_key) VALUES($1,$2,$3,$4,$5,$6,$6)
   ON CONFLICT(user_id,jurisdiction_id,official_id) DO UPDATE SET favorite=$4,watch=$5,seen_key=CASE WHEN NOT nf_guests.saved.watch AND $5 THEN $6 ELSE nf_guests.saved.seen_key END,email_key=CASE WHEN NOT nf_guests.saved.watch AND $5 THEN $6 ELSE nf_guests.saved.email_key END`,[user,...businessKey(b),b.favorite,b.watch,row.inspection_key]);
  return {saved:true};
 }
 async unsave(user,b){await this.query('DELETE FROM nf_guests.saved WHERE user_id=$1 AND jurisdiction_id=$2 AND official_id=$3',[user,...businessKey(b)]);return {removed:true};}
 async seen(user,b){const row=await this.requireBusiness(b);await this.query('UPDATE nf_guests.saved SET seen_key=$4 WHERE user_id=$1 AND jurisdiction_id=$2 AND official_id=$3',[user,...businessKey(b),row.inspection_key]);return {saved:true};}
 async businessState(user,b){
  await this.requireBusiness(b);
  const keys=[user,...businessKey(b)];
  const [saved]=await this.query('SELECT favorite,watch FROM nf_guests.saved WHERE user_id=$1 AND jurisdiction_id=$2 AND official_id=$3',keys);
  const [review]=await this.query(`SELECT id,rating,body AS text,status,version FROM nf_guests.reviews WHERE user_id=$1 AND jurisdiction_id=$2 AND official_id=$3 AND status<>'deleted'`,keys);
  const [profile]=await this.query('SELECT display_name FROM nf_guests.profiles WHERE user_id=$1',[user]);
  return {favorite:saved?.favorite??false,watch:saved?.watch??false,review:review??null,hasProfile:!!profile};
 }
 async dashboard(user,offset=0){
  pagination(offset);
  const [profile]=await this.query('SELECT display_name AS "displayName",home_city AS "homeCity",sort,email_alerts AS "emailAlerts" FROM nf_guests.profiles WHERE user_id=$1',[user]);
  const saved=await this.query(`SELECT s.jurisdiction_id AS "jurisdictionId",s.official_id AS "officialId",s.favorite,s.watch,e.name,e.slug,e.state_code AS "stateCode",e.latest_inspection_date AS "inspectionDate",e.latest_result AS result,
   e.id IS NOT NULL AS available, s.watch AND e.id IS NOT NULL AND s.seen_key IS DISTINCT FROM (SELECT i.id FROM nf_production.inspections i WHERE i.establishment_id=e.id ORDER BY i.inspection_date DESC NULLS LAST,i.id DESC LIMIT 1) AS updated
   FROM nf_guests.saved s LEFT JOIN nf_production.establishments e ON e.jurisdiction_id=s.jurisdiction_id AND e.official_id=s.official_id AND e.jurisdiction_id IN(SELECT id FROM nf_production.jurisdictions WHERE enabled AND coverage_status IN ('available','limited')) WHERE s.user_id=$1 AND (s.favorite OR s.watch) ORDER BY s.created_at DESC,s.jurisdiction_id,s.official_id LIMIT 21 OFFSET $2`,[user,offset]);
  const reviews=await this.query(`SELECT r.id,r.jurisdiction_id AS "jurisdictionId",r.official_id AS "officialId",r.rating,r.body AS text,r.status,r.version,r.updated_at AS "updatedAt",e.name,e.slug,e.state_code AS "stateCode" FROM nf_guests.reviews r LEFT JOIN nf_production.establishments e ON e.jurisdiction_id=r.jurisdiction_id AND e.official_id=r.official_id AND e.jurisdiction_id IN(SELECT id FROM nf_production.jurisdictions WHERE enabled AND coverage_status IN ('available','limited')) WHERE r.user_id=$1 AND r.status<>'deleted' ORDER BY r.updated_at DESC,r.id LIMIT 21 OFFSET $2`,[user,offset]);
  return {profile:profile??null,saved:saved.slice(0,20),reviews:reviews.slice(0,20),hasMore:saved.length>20||reviews.length>20,offset};
 }
 async review(user,b){
  const text=typeof b.text==='string'?b.text.trim():'';
  if(!Number.isInteger(b.rating)||b.rating<1||b.rating>5||text.length<10||text.length>3000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))fail('Invalid review. Use 1–5 stars and 10–3000 characters.');
  await this.requireBusiness(b);const profile=await this.requireProfile(user);
  const [row]=await this.query(`WITH changed AS(INSERT INTO nf_guests.reviews(id,user_id,jurisdiction_id,official_id,display_name,rating,body,status) VALUES($1,$2,$3,$4,$5,$6,$7,'pending')
   ON CONFLICT(user_id,jurisdiction_id,official_id) DO UPDATE SET display_name=$5,rating=$6,body=$7,status='pending',version=nf_guests.reviews.version+1,updated_at=now() RETURNING *)
   INSERT INTO nf_guests.review_audit(id,review_id,actor_id,action,snapshot) SELECT $8,id,$2,'submit',to_jsonb(changed) FROM changed RETURNING review_id AS id`,[randomUUID(),user,...businessKey(b),profile.display_name,b.rating,text,randomUUID()]);
  return {...row,status:'pending'};
 }
 async deleteReview(user,id){
  if(!clean(id,80))fail('Invalid review');
  await this.query(`WITH changed AS(UPDATE nf_guests.reviews SET status='deleted',version=version+1,updated_at=now() WHERE id=$1 AND user_id=$2 AND status<>'deleted' RETURNING *)
   INSERT INTO nf_guests.review_audit(id,review_id,actor_id,action,snapshot) SELECT $3,id,$2,'delete',to_jsonb(changed) FROM changed`,[id,user,randomUUID()]);return {deleted:true};
 }
 async publicReviews(b,offset=0){
  pagination(offset);if(!await this.business(b))return {items:[],count:0,average:null,hasMore:false};
  const keys=businessKey(b);
  const [stats]=await this.query(`SELECT count(*)::int AS count,round(avg(rating)::numeric,1)::float8 AS average FROM nf_guests.reviews WHERE jurisdiction_id=$1 AND official_id=$2 AND status='approved'`,keys);
  const items=await this.query(`SELECT id,display_name AS "displayName",rating,body AS text,updated_at AS "updatedAt" FROM nf_guests.reviews WHERE jurisdiction_id=$1 AND official_id=$2 AND status='approved' ORDER BY created_at DESC,id LIMIT 21 OFFSET $3`,[...keys,offset]);
  return {...stats,items:items.slice(0,20),hasMore:items.length>20};
 }
 async report(user,b){
  const reason=clean(b.reason,500);if(!clean(b.id,80)||!reason||reason.length<5)fail('Enter a report reason of 5–500 characters.');
  const rows=await this.query(`INSERT INTO nf_guests.reports(id,review_id,user_id,reason) SELECT $1,r.id,$2,$3 FROM nf_guests.reviews r WHERE r.id=$4 AND r.status='approved' ON CONFLICT(review_id,user_id) DO NOTHING RETURNING id`,[randomUUID(),user,reason,b.id]);
  return {reported:rows.length>0};
 }
 async queue(offset=0){
  pagination(offset);
  const items=await this.query(`SELECT r.id,r.version,r.display_name AS "displayName",r.rating,r.body AS text,r.status,r.updated_at AS "updatedAt",r.jurisdiction_id AS "jurisdictionId",r.official_id AS "officialId",e.name FROM nf_guests.reviews r LEFT JOIN nf_production.establishments e ON e.jurisdiction_id=r.jurisdiction_id AND e.official_id=r.official_id WHERE r.status='pending' OR EXISTS(SELECT 1 FROM nf_guests.reports p WHERE p.review_id=r.id AND NOT p.resolved) ORDER BY r.updated_at,r.id LIMIT 21 OFFSET $1`,[offset]);
  const reports=items.length?await this.query('SELECT id,review_id AS "reviewId",reason FROM nf_guests.reports WHERE NOT resolved AND review_id=ANY($1::text[]) ORDER BY created_at',[items.map(r=>r.id)]):[];
  return {items:items.slice(0,20),reports,hasMore:items.length>20,offset};
 }
 async moderate(actor,b){
  if(!clean(b.id,80)||!Number.isInteger(b.version)||!['approved','rejected'].includes(b.status))fail('Invalid moderation decision');
  const rows=await this.query(`WITH changed AS(UPDATE nf_guests.reviews SET status=$3,updated_at=now() WHERE id=$1 AND version=$2 AND status IN ('pending','approved','rejected') RETURNING *), audited AS(
   INSERT INTO nf_guests.review_audit(id,review_id,actor_id,action,snapshot) SELECT $4,id,$5,$3,to_jsonb(changed) FROM changed RETURNING review_id)
   ,resolved AS(UPDATE nf_guests.reports SET resolved=true WHERE review_id IN(SELECT review_id FROM audited) RETURNING id) SELECT review_id FROM audited`,[b.id,b.version,b.status,randomUUID(),actor]);
  if(!rows.length)fail('This review changed. Refresh before moderating.',409);
  return {saved:true};
 }
}
