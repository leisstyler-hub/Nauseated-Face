import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { TRAFFIC_SCHEMA, recordPageView, trafficReport, signVisitor, readVisitor, trafficRequest, excludedTraffic, pageCategory } from './traffic.mjs';

const visitor='11111111-1111-4111-8111-111111111111';
const event=(i)=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
test('page refreshes and duplicate requests do not create return visits; a later session does', async()=>{
 const db=new PGlite();
 try{
  await db.exec(TRAFFIC_SCHEMA);
  const add=(i,at,id=visitor)=>recordPageView(db,{visitorId:id,eventId:event(i),category:'home',at:new Date(at)});
  await add(1,'2026-11-14T18:00:00Z');
  await add(1,'2026-11-14T18:00:01Z');
  await add(2,'2026-11-14T18:20:00Z');
  let r=await trafficReport(db,'today',new Date('2026-11-14T18:25:00Z'));
  assert.deepEqual([r.visitors,r.visits,r.pageviews,r.returningVisitors,r.returningPercent],[1,1,2,0,0]);
  await add(3,'2026-11-14T18:51:00Z');
  await add(4,'2026-11-14T19:00:00Z','22222222-2222-4222-8222-222222222222');
  r=await trafficReport(db,'today',new Date('2026-11-14T20:00:00Z'));
  assert.deepEqual([r.visitors,r.visits,r.pageviews,r.returningVisitors,r.returningPercent],[2,3,4,1,50]);
  assert.equal(r.days.length,1);assert.equal(r.days[0].visitors,2);
 }finally{await db.close();}
});

test('Pacific calendar windows, distinct-period counts, prior visits and empty periods are honest',async()=>{
 const db=new PGlite();
 try{
  await db.exec(TRAFFIC_SCHEMA);
  await recordPageView(db,{visitorId:visitor,eventId:event(10),category:'search',at:new Date('2026-11-01T07:30:00Z')});
  await recordPageView(db,{visitorId:visitor,eventId:event(11),category:'search',at:new Date('2026-11-02T07:30:00Z')});
  let r=await trafficReport(db,'3',new Date('2026-11-02T09:00:00Z'));
  assert.equal(r.visitors,1);assert.equal(r.returningPercent,100);assert.equal(r.days.length,3);
  assert.equal(r.days.find(d=>d.date==='2026-11-01').pageviews,2);
  r=await trafficReport(db,'today',new Date('2026-11-02T09:00:00Z'));
  assert.equal(r.pageviews,0);assert.equal(r.returningPercent,null);
  r=await trafficReport(db,'month',new Date('2026-11-02T09:00:00Z'));assert.equal(r.days.length,2);
  for(const range of ['7','30']){r=await trafficReport(db,range,new Date('2026-11-02T09:00:00Z'));assert.equal(r.days.length,Number(range));assert.equal(r.visitors,1);}
  await assert.rejects(trafficReport(db,'999'),/range/);
 }finally{await db.close();}
});

test('visitor signatures, privacy signals, smoke/admin/bot exclusions and categories',()=>{
 const key='synthetic-traffic-key-of-at-least-32-characters';
 const cookie=signVisitor(visitor,key);assert.equal(readVisitor(cookie,key),visitor);assert.equal(readVisitor(cookie+'x',key),null);assert.equal(readVisitor(cookie,'different'),null);
 for(const headers of [{'dnt':'1'},{'sec-gpc':'1'},{'x-nf-smoke-test':'true'},{'user-agent':'Googlebot'},{cookie:'__Secure-nf-admin.session_token=anything'}]) assert.equal(excludedTraffic(new Headers(headers)),true);
 assert.equal(excludedTraffic(new Headers({'user-agent':'Mozilla/5.0'})),false);
 assert.equal(pageCategory('/search?email=private'),'search');assert.equal(pageCategory('/restaurants/wa/a'),'restaurant');assert.equal(pageCategory('/private-email@example.test'),'other');
});

test('public collector validates origin and payload before writing; excluded browsers never get identifiers',async()=>{
 const request=(body,extra={})=>new Request('https://site.test/api/traffic',{method:'POST',headers:{origin:'https://site.test','content-type':'application/json',...extra},body:JSON.stringify(body)});
 let calls=0;const record=async()=>{calls++;};
 const body={eventId:event(20),category:'home'};
 const key='synthetic-traffic-key-of-at-least-32-characters';
 assert.equal((await trafficRequest(request(body,{origin:'https://other.test'}),key,record)).status,403);
 assert.equal((await trafficRequest(request({...body,category:'private-data'}),key,record)).status,400);
 const excluded=await trafficRequest(request(body,{dnt:'1'}),key,record);assert.equal(excluded.status,204);assert.equal(excluded.headers.get('set-cookie'),null);assert.equal(calls,0);
 const ok=await trafficRequest(request(body),key,record);assert.equal(ok.status,204);assert.match(ok.headers.get('set-cookie'),/HttpOnly/);assert.match(ok.headers.get('set-cookie'),/Secure/);assert.equal(calls,1);
 const failed=await trafficRequest(request(body),key,async()=>{throw Error('private');});assert.equal(failed.status,503);assert.equal(failed.headers.get('set-cookie'),null);
});

test('ranking routes are distinct from city pages',()=>{
 assert.equal(pageCategory('/rankings/most-violations'),'ranking');
 assert.equal(pageCategory('/washington/seattle'),'city');
});

test('growth dimensions and actions preserve page counts and mature return cohorts',async()=>{
 const db=new PGlite();
 try{
  await db.exec(TRAFFIC_SCHEMA);
  await db.query("UPDATE traffic_meta SET collection_started='2026-10-01T07:00:00Z'");
  const add=(i,at,extra={})=>recordPageView(db,{visitorId:visitor,eventId:event(i),category:'search',at:new Date(at),...extra});
  await add(100,'2026-11-01T18:00:00Z',{area:'wa/seattle',content:'/restaurants/washington/example',device:'phone',source:'search'});
  await add(101,'2026-11-02T18:00:00Z');
  await add(102,'2026-11-09T18:00:00Z',{action:'search_results'});
  await add(103,'2026-11-09T18:01:00Z',{action:'search_result_click'});
  await add(104,'2026-11-09T18:02:00Z',{category:'restaurant'});
  await add(105,'2026-11-09T18:03:00Z',{category:'restaurant',action:'full_report_click'});
  await add(105,'2026-11-09T18:03:01Z',{action:'full_report_click'});
  const r=await trafficReport(db,'30',new Date('2026-11-15T20:00:00Z'));
  assert.equal(r.pageviews,3);assert.equal(r.clicks,2);
  assert.equal(r.breakdowns.areas.find(x=>x.label==='wa/seattle').pageviews,1);
  assert.equal(r.breakdowns.devices.find(x=>x.label==='phone').visitors,1);
  assert.deepEqual(r.retention.map(x=>[x.days,x.eligible,x.returned]),[[1,1,1],[7,1,1],[30,0,0]]);
  assert.deepEqual(r.journey.map(x=>x.visits),[1,1,1,1]);
  assert.equal(r.comparison.available,false);
 }finally{await db.close();}
});

test('collector rejects malformed dimensions and excludes Neon administrators',async()=>{
 const key='synthetic-traffic-key-of-at-least-32-characters';let calls=0;
 const req=body=>new Request('https://site.test/api/traffic',{method:'POST',headers:{origin:'https://site.test','content-type':'application/json'},body:JSON.stringify(body)});
 for(const extra of [{area:null},{content:'/admin/reset-token'},{source:'https://private.test/?email=x'},{action:'password_submit'},{device:'fingerprint'},{query:'private'}]){
  assert.equal((await trafficRequest(req({eventId:event(200),category:'home',...extra}),key,async()=>calls++)).status,400);
 }
 assert.equal((await trafficRequest(req(null),key,async()=>calls++)).status,400);
 assert.equal(excludedTraffic(new Headers({cookie:'__Secure-neon-auth.session_token=test'})),true);
 assert.equal(calls,0);
});

test('return cohorts include later calendar-day activity within one session and mature only after complete days',async()=>{
 const db=new PGlite();try{
  await db.exec(TRAFFIC_SCHEMA);
  await recordPageView(db,{visitorId:visitor,eventId:event(301),category:'home',at:new Date('2026-11-02T07:55:00Z')});
  await recordPageView(db,{visitorId:visitor,eventId:event(302),category:'home',at:new Date('2026-11-02T08:05:00Z')});
  let r=await trafficReport(db,'7',new Date('2026-11-03T08:00:00Z'));
  assert.deepEqual(r.retention[0],{days:1,eligible:1,returned:1});
  r=await trafficReport(db,'7',new Date('2026-11-02T20:00:00Z'));
  assert.equal(r.retention[0].eligible,0);
 }finally{await db.close();}
});

test('growth uses matched Pacific elapsed calendar periods across DST and retains legacy history',async()=>{
 const db=new PGlite();try{
  await db.exec(TRAFFIC_SCHEMA);await db.exec(TRAFFIC_SCHEMA);
  await db.query("UPDATE traffic_meta SET collection_started='2026-10-01T07:00:00Z'");
  for(const [i,at] of [[401,'2026-10-31T19:59:00Z'],[402,'2026-10-31T20:01:00Z'],[403,'2026-11-01T19:59:00Z']])await recordPageView(db,{visitorId:visitor,eventId:event(i),category:'home',at:new Date(at)});
  const r=await trafficReport(db,'today',new Date('2026-11-01T20:00:00Z'));
  assert.equal(r.comparison.start,'2026-10-31T07:00:00.000Z');
  assert.equal(r.comparison.end,'2026-10-31T19:00:00.000Z');
  assert.equal(r.comparison.available,true);assert.equal(r.comparison.pageviews,0);
  assert.equal(r.pageviews,1);
 }finally{await db.close();}
});

test('30-day retention remains measurable when the activity range is today',async()=>{
 const db=new PGlite();try{
  await db.exec(TRAFFIC_SCHEMA);
  await recordPageView(db,{visitorId:visitor,eventId:event(501),category:'home',at:new Date('2026-10-01T18:00:00Z')});
  await recordPageView(db,{visitorId:visitor,eventId:event(502),category:'home',at:new Date('2026-10-31T18:00:00Z')});
  const r=await trafficReport(db,'today',new Date('2026-11-15T20:00:00Z'));
  assert.deepEqual(r.retention[2],{days:30,eligible:1,returned:1});
 }finally{await db.close();}
});

test('collector preserves native uppercase inspection identifiers without query strings',async()=>{
 const key='synthetic-traffic-key-of-at-least-32-characters';const body={eventId:event(601),category:'inspection',action:'full_report_click',content:'/inspections/PFE-PR-3129577/PFE-DAQ8KWWRJ'};
 let stored;
 const response=await trafficRequest(new Request('https://site.test/api/traffic',{method:'POST',headers:{origin:'https://site.test','content-type':'application/json'},body:JSON.stringify(body)}),key,async event=>{stored=event;});
 assert.equal(response.status,204);assert.equal(stored.content,body.content);
});
