import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { trafficInsights } from './traffic-insights.mjs';
export { pageCategory } from './traffic-categories.mjs';

export const TRAFFIC_SCHEMA = `
CREATE TABLE IF NOT EXISTS traffic_meta(id integer PRIMARY KEY CHECK(id=1), collection_started timestamptz NOT NULL DEFAULT now());
INSERT INTO traffic_meta(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS traffic_visitors(id uuid PRIMARY KEY, first_seen timestamptz NOT NULL, last_seen timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS traffic_sessions(id uuid PRIMARY KEY, visitor_id uuid NOT NULL REFERENCES traffic_visitors(id), started_at timestamptz NOT NULL, last_seen timestamptz NOT NULL, is_returning boolean NOT NULL);
CREATE INDEX IF NOT EXISTS traffic_sessions_visitor ON traffic_sessions(visitor_id,last_seen DESC);
CREATE TABLE IF NOT EXISTS traffic_events(id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES traffic_sessions(id), category text NOT NULL, occurred_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS traffic_events_time ON traffic_events(occurred_at,session_id);
ALTER TABLE traffic_events ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'pageview';
ALTER TABLE traffic_events ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT 'unknown';
ALTER TABLE traffic_events ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT 'unknown';
ALTER TABLE traffic_events ADD COLUMN IF NOT EXISTS device text NOT NULL DEFAULT 'unknown';
ALTER TABLE traffic_events ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'unknown';
ALTER TABLE traffic_meta ADD COLUMN IF NOT EXISTS insights_started timestamptz NOT NULL DEFAULT now();`;
export const ACTIONS=new Set(['pageview','city_select','search_submit','search_results','search_empty','search_result_click','restaurant_click','category_click','chart_click','full_report_click','official_source_click']);
const DIMENSION=/^[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+){1,2}$/;
export function validDimensions(body){
 const keys=['eventId','category','action','area','content','device','source'];
 return Object.keys(body).every(k=>keys.includes(k))
  && (body.action===undefined||ACTIONS.has(body.action))
  && (body.area===undefined||body.area==='unknown'||(typeof body.area==='string'&&body.area.length<=120&&/^[a-z-]+\/[a-z0-9-]+$/.test(body.area)))
  && (body.content===undefined||body.content==='unknown'||(typeof body.content==='string'&&body.content.length<=180&&DIMENSION.test(body.content.replace(/^\//,''))&&/^\/(restaurants|rankings|inspections)\//.test(body.content)))
  && (body.device===undefined||['phone','tablet','desktop','unknown'].includes(body.device))
  && (body.source===undefined||['search','social','email','paid','referral','direct-or-unknown','internal','unknown'].includes(body.source));
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CATEGORIES=new Set(['home','search','locations','inspection','restaurant','city','ranking','about','privacy','other']);
const COOKIE='nf-visitor';
export const TRAFFIC_TIMEZONE='America/Los_Angeles';
export function signVisitor(id,key){return id+'.'+createHmac('sha256',key).update('traffic:'+id).digest('hex');}
export function readVisitor(value,key){
 if(!value||!key)return null;
 const [id,signature]=value.split('.');if(!UUID.test(id??'')||!/^[a-f0-9]{64}$/.test(signature??''))return null;
 const expected=Buffer.from(signVisitor(id,key).split('.')[1]);const actual=Buffer.from(signature);
 return timingSafeEqual(expected,actual)?id:null;
}
export function excludedTraffic(headers){
 return headers.get('dnt')==='1'||headers.get('sec-gpc')==='1'||headers.get('x-nf-smoke-test')==='true'
  ||/(?:^|;\s*)(?:__Secure-)?nf-admin\.session_token=/.test(headers.get('cookie')??'')
  ||/neon-auth/.test(headers.get('cookie')??'')
  ||/bot|crawler|spider|headless|playwright|curl|wget/i.test(headers.get('user-agent')??'');
}
export async function recordPageView(database,{visitorId,eventId,category,action='pageview',area='unknown',content='unknown',device='unknown',source='unknown',at=new Date()}){
 const client=database.connect?await database.connect():database;
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[visitorId]);
  if((await client.query('SELECT id FROM traffic_events WHERE id=$1',[eventId])).rows.length){await client.query('COMMIT');return;}
  await client.query('INSERT INTO traffic_visitors(id,first_seen,last_seen) VALUES($1,$2,$2) ON CONFLICT(id) DO UPDATE SET last_seen=EXCLUDED.last_seen',[visitorId,at]);
  const previous=(await client.query('SELECT id,last_seen FROM traffic_sessions WHERE visitor_id=$1 ORDER BY last_seen DESC LIMIT 1',[visitorId])).rows[0];
  let sessionId=previous?.id;
  if(!previous||at-new Date(previous.last_seen)>=30*60*1000){
   sessionId=randomUUID();
   await client.query('INSERT INTO traffic_sessions(id,visitor_id,started_at,last_seen,is_returning) VALUES($1,$2,$3,$3,$4)',[sessionId,visitorId,at,!!previous]);
  }else await client.query('UPDATE traffic_sessions SET last_seen=$1 WHERE id=$2',[at,sessionId]);
  await client.query('INSERT INTO traffic_events(id,session_id,category,occurred_at,action,area,content,device,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[eventId,sessionId,category,at,action,area,content,device,source]);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
 finally{client.release?.();}
}
export async function trafficRequest(request,key,record){
 const headers={'Cache-Control':'no-store'};
 const reply=(status,body)=>body?Response.json(body,{status,headers}):new Response(null,{status,headers});
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply(403,{error:'Invalid request origin'});
 if(excludedTraffic(request.headers))return reply(204);
 if(!key||key.length<32)return reply(503,{error:'Traffic collection unavailable'});
 if(!request.headers.get('content-type')?.startsWith('application/json')||Number(request.headers.get('content-length')??0)>1024)return reply(400,{error:'Invalid request'});
 try{
  let body;try{const raw=await request.text();if(raw.length>1024)return reply(400,{error:'Invalid traffic event'});body=JSON.parse(raw);}catch{return reply(400,{error:'Invalid traffic event'});}
  if(!body||typeof body!=='object'||Array.isArray(body)||!UUID.test(body.eventId??'')||!CATEGORIES.has(body.category)||!validDimensions(body))return reply(400,{error:'Invalid traffic event'});
  const value=(request.headers.get('cookie')??'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  const visitorId=readVisitor(value,key)??randomUUID();
  await record({...body,visitorId});
  const response=reply(204);
  response.headers.set('Set-Cookie',`${COOKIE}=${signVisitor(visitorId,key)}; Path=/; Max-Age=15552000; HttpOnly; SameSite=Lax${new URL(request.url).protocol==='https:'?'; Secure':''}`);
  return response;
 }catch{return reply(503,{error:'Traffic collection unavailable'});}
}
export async function trafficReport(database,range='7',at=new Date()){
 if(!['today','3','7','30','month'].includes(range))throw new Error('Invalid traffic range');
 const client=database.connect?await database.connect():database;
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const result=await readTrafficReport(client,range,at);
  await client.query('COMMIT');return result;
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
 finally{client.release?.();}
}
async function readTrafficReport(database,range,at){
 if(!['today','3','7','30','month'].includes(range))throw new Error('Invalid traffic range');
 const now=at.toISOString();const count=range==='today'?1:Number(range);
 const startSql=range==='month'?"date_trunc('month',$1::timestamptz AT TIME ZONE 'America/Los_Angeles')":"date_trunc('day',$1::timestamptz AT TIME ZONE 'America/Los_Angeles')-(($2::int-1)*interval '1 day')";
 const startParams=range==='month'?[now]:[now,count];
 const start=(await database.query(`SELECT (${startSql}) AT TIME ZONE 'America/Los_Angeles' AS start`,startParams)).rows[0].start;
 const totals=(await database.query(`SELECT count(*)::int AS pageviews,count(DISTINCT s.id)::int AS visits,count(DISTINCT s.visitor_id)::int AS visitors,count(DISTINCT s.visitor_id) FILTER(WHERE s.is_returning)::int AS returning_visitors FROM traffic_events e JOIN traffic_sessions s ON s.id=e.session_id WHERE e.action='pageview' AND e.occurred_at >= $1 AND e.occurred_at <= $2`,[start,now])).rows[0];
 const days=(await database.query(`WITH dates AS (SELECT generate_series(($1::timestamptz AT TIME ZONE 'America/Los_Angeles')::date,($2::timestamptz AT TIME ZONE 'America/Los_Angeles')::date,interval '1 day')::date AS day), counts AS (SELECT (e.occurred_at AT TIME ZONE 'America/Los_Angeles')::date AS day,count(*)::int AS pageviews,count(DISTINCT s.id)::int AS visits,count(DISTINCT s.visitor_id)::int AS visitors,count(DISTINCT s.visitor_id) FILTER(WHERE s.is_returning)::int AS returning_visitors FROM traffic_events e JOIN traffic_sessions s ON s.id=e.session_id WHERE e.action='pageview' AND e.occurred_at >= $1 AND e.occurred_at <= $2 GROUP BY 1) SELECT to_char(d.day,'YYYY-MM-DD') AS date,coalesce(c.pageviews,0)::int AS pageviews,coalesce(c.visits,0)::int AS visits,coalesce(c.visitors,0)::int AS visitors,coalesce(c.returning_visitors,0)::int AS returning_visitors FROM dates d LEFT JOIN counts c ON c.day=d.day ORDER BY d.day`,[start,now])).rows;
 const meta=(await database.query('SELECT collection_started,insights_started FROM traffic_meta WHERE id=1')).rows[0];
 const parts=meta?Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TRAFFIC_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(meta.collection_started)).map(p=>[p.type,p.value])):null;
 const collectionDate=parts?`${parts.year}-${parts.month}-${parts.day}`:null;
 const insights=await trafficInsights(database,{start,now,meta});
 return {...insights,range,timezone:TRAFFIC_TIMEZONE,start:new Date(start).toISOString(),end:now,collectionStarted:meta?.collection_started??null,pageviews:totals.pageviews,visits:totals.visits,visitors:totals.visitors,returningVisitors:totals.returning_visitors,returningPercent:totals.visitors?Math.round(1000*totals.returning_visitors/totals.visitors)/10:null,days:days.map(day=>({...day,available:!!collectionDate&&day.date>=collectionDate}))};
}
