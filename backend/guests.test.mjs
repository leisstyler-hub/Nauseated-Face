import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {GUEST_SCHEMA,GuestStore,guestRequest} from './guests.mjs';

async function fixture(){
 const db=new PGlite();
 await db.exec(`CREATE SCHEMA nf_production;CREATE TABLE nf_production.jurisdictions(id text primary key,enabled boolean,coverage_status text);
 CREATE TABLE nf_production.establishments(id text,jurisdiction_id text,official_id text,name text,slug text,state_code text,city text,latest_inspection_date text,latest_result text,latest_score text,inspection_count bigint);
 CREATE TABLE nf_production.inspections(id text,establishment_id text,inspection_date text);
 INSERT INTO nf_production.jurisdictions VALUES('wa-king',true,'available');
 INSERT INTO nf_production.establishments VALUES('e1','wa-king','official1','Synthetic Cafe','synthetic-cafe','WA','Seattle','2026-01-01','Satisfactory','0',1);
 INSERT INTO nf_production.inspections VALUES('i1','e1','2026-01-01');`);
 await db.exec(GUEST_SCHEMA);
 const store=new GuestStore(db);
 return {db,store};
}
const business={jurisdictionId:'wa-king',officialId:'official1'};
test('guest saves survive business rebuild, remain private and obey source visibility',async()=>{
 const {db,store}=await fixture();try{
  await store.profile('A',{displayName:'Guest A',homeCity:'Seattle',sort:'name',emailAlerts:false});
  await store.save('A',{...business,favorite:true,watch:true});
  assert.equal((await store.dashboard('A')).saved.length,1);
  assert.equal((await store.dashboard('B')).saved.length,0);
  await db.exec("DELETE FROM nf_production.establishments;INSERT INTO nf_production.establishments VALUES('e1','wa-king','official1','Renamed Cafe','same-slug','WA','Seattle','2026-02-01','Unsatisfactory','25',2);INSERT INTO nf_production.inspections VALUES('i2','e1','2026-02-01')");
  const saved=(await store.dashboard('A')).saved[0];assert.equal(saved.name,'Renamed Cafe');assert.equal(saved.updated,true);
  await store.seen('A',business);assert.equal((await store.dashboard('A')).saved[0].updated,false);
  await store.profile('B',{displayName:'Guest B',homeCity:'',sort:'date',emailAlerts:false});
  await store.save('B',{...business,favorite:false,watch:false});assert.equal((await store.dashboard('A')).saved.length,1);
  await db.exec('UPDATE nf_production.jurisdictions SET enabled=false');assert.equal((await store.dashboard('A')).saved[0].available,false);
 }finally{await db.close();}
});
test('reviews publish only after approval; editing hides prior text; public payload excludes identity',async()=>{
 const {db,store}=await fixture();try{
  await store.profile('A',{displayName:'Guest A',homeCity:'',sort:'date',emailAlerts:false});
  const r=await store.review('A',{...business,rating:4,text:'Synthetic visit review.'});
  assert.equal((await store.publicReviews(business)).count,0);
  await store.moderate('owner',{id:r.id,version:1,status:'approved'});
  let published=await store.publicReviews(business);assert.equal(published.count,1);assert.equal(published.average,4);assert.equal(published.items[0].displayName,'Guest A');assert.equal('user_id' in published.items[0],false);
  await store.review('A',{...business,rating:2,text:'Updated synthetic visit.'});
  assert.equal((await store.publicReviews(business)).count,0);
  await assert.rejects(store.moderate('owner',{id:r.id,version:1,status:'approved'}),/changed/);
  await store.moderate('owner',{id:r.id,version:2,status:'approved'});
  await store.deleteReview('B',r.id);assert.equal((await store.publicReviews(business)).count,1);
  await store.report('B',{id:r.id,reason:'Synthetic report'});assert.equal((await store.queue()).reports.length,1);
  await store.deleteReview('A',r.id);assert.equal((await store.publicReviews(business)).count,0);
 }finally{await db.close();}
});
test('guest boundary requires verified identity, same origin and bounded validated input',async()=>{
 const req=body=>new Request('https://example.com/api/guest',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify(body)});
 const call=async()=>({ok:true});
 assert.equal((await guestRequest(req({}),null,call)).status,401);
 assert.equal((await guestRequest(req({}),{user:{id:'A',emailVerified:false}},call)).status,401);
 const session={user:{id:'A',emailVerified:true}};
 assert.equal((await guestRequest(new Request('https://example.com/api/guest',{method:'POST'}),session,call)).status,403);
 assert.equal((await guestRequest(req({text:'x'.repeat(13000)}),session,call)).status,400);
 assert.equal((await guestRequest(req({}),session,call)).status,200);
 const {db,store}=await fixture();try{
  await assert.rejects(store.review('A',{...business,rating:6,text:'Bad rating'}),/Invalid/);
  await assert.rejects(store.review('A',{...business,rating:4,text:'Visit text'}),/display name/);
  await assert.rejects(store.profile('A',{displayName:'',sort:'date',homeCity:'',emailAlerts:false}),/Invalid/);
 }finally{await db.close();}
});
test('preview and production profile data are isolated even for identical provider identities',async()=>{
 const {db,store}=await fixture();try{
  await db.exec(GUEST_SCHEMA.replaceAll('nf_guests_production','nf_guests_preview'));
  const prefs={displayName:'Production Guest',homeCity:'',sort:'date',emailAlerts:false};
  await store.profile('same-provider-id',prefs);
  await new GuestStore(db,'nf_preview').profile('same-provider-id',{...prefs,displayName:'Preview Guest'});
  assert.equal((await db.query('SELECT display_name FROM nf_guests_production.profiles WHERE user_id=$1',['same-provider-id'])).rows[0].display_name,'Production Guest');
  assert.equal((await db.query('SELECT display_name FROM nf_guests_preview.profiles WHERE user_id=$1',['same-provider-id'])).rows[0].display_name,'Preview Guest');
 }finally{await db.close();}
});
