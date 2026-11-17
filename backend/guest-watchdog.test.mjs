import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {GUEST_SCHEMA,GuestStore} from './guests.mjs';
import {deliverWatchdog,unsubscribeToken,readUnsubscribeToken} from './guest-watchdog.mjs';
test('watchdog honors opt-in, retries the same delivery key, and stops after opt-out',async()=>{
 const db=new PGlite();try{
  await db.exec(`CREATE SCHEMA nf_production;CREATE TABLE nf_production.jurisdictions(id text,enabled boolean,coverage_status text);CREATE TABLE nf_production.establishments(id text,jurisdiction_id text,official_id text,name text,slug text,state_code text,city text,latest_inspection_date text,latest_result text,latest_score text,inspection_count bigint);CREATE TABLE nf_production.inspections(id text,establishment_id text,inspection_date text);
  INSERT INTO nf_production.jurisdictions VALUES('wa-king',true,'available');INSERT INTO nf_production.establishments VALUES('e','wa-king','b','Synthetic','synthetic','WA','Seattle','2026-01-01','Satisfactory','0',1);INSERT INTO nf_production.inspections VALUES('i1','e','2026-01-01');`);
  await db.exec(GUEST_SCHEMA);const store=new GuestStore(db),profile={displayName:'Guest',homeCity:'',sort:'date',emailAlerts:false},b={jurisdictionId:'wa-king',officialId:'b',favorite:false,watch:true};
  await store.profile('A',profile,'synthetic@example.invalid');await store.save('A',b);
  await db.exec("INSERT INTO nf_production.inspections VALUES('i2','e','2026-02-01')");
  const sent=[];const send=async message=>{sent.push(message);};const options={origin:'https://example.com',secret:'s'.repeat(32)};
  await deliverWatchdog(store,send,options);assert.equal(sent.length,0);
  await store.profile('A',{...profile,emailAlerts:true},'synthetic@example.invalid');
  assert.equal((await deliverWatchdog(store,async message=>{sent.push(message);throw Error('synthetic provider failure');},options)).failed,1);
  await deliverWatchdog(store,send,options);assert.equal(sent.length,2);assert.equal(sent[0].id,sent[1].id);
  await deliverWatchdog(store,send,options);assert.equal(sent.length,2);
  await db.exec("INSERT INTO nf_production.inspections VALUES('i3','e','2026-03-01')");
  await store.profile('A',profile,'synthetic@example.invalid');await deliverWatchdog(store,send,options);assert.equal(sent.length,2);
  await store.profile('B',{...profile,emailAlerts:true},'second@example.invalid');await store.save('B',b);
  await store.profile('C',{...profile,emailAlerts:true},'third@example.invalid');await store.save('C',b);
  await db.exec("INSERT INTO nf_production.inspections VALUES('i4','e','2026-04-01')");
  const batch=await deliverWatchdog(store,async message=>{if(message.to==='second@example.invalid')throw Error('recipient failure');sent.push(message);},options);
  assert.equal(batch.failed,1);assert.equal(batch.sent,1);
  // A terminal outbox item must not occupy the selection limit ahead of a new subscriber.
  await db.exec("UPDATE nf_guests_production.mail SET status='uncertain' WHERE user_id='B'");
  await store.profile('D',{...profile,emailAlerts:true},'fourth@example.invalid');await store.save('D',b);
  await db.exec("INSERT INTO nf_production.inspections VALUES('i5','e','2026-05-01')");
  await db.exec(`INSERT INTO nf_guests_production.profiles(user_id,display_name,email,email_alerts) SELECT 'terminal-'||n,'Synthetic','terminal@example.invalid',true FROM generate_series(1,50) n;
   INSERT INTO nf_guests_production.saved(user_id,jurisdiction_id,official_id,watch,email_key,created_at) SELECT 'terminal-'||n,'wa-king','b',true,'i4','2020-01-01' FROM generate_series(1,50) n;
   INSERT INTO nf_guests_production.mail(id,user_id,jurisdiction_id,official_id,inspection_key,status) SELECT 'terminal-mail-'||n,'terminal-'||n,'wa-king','b','i5','uncertain' FROM generate_series(1,50) n;`);
  await deliverWatchdog(store,send,options);assert.ok(sent.some(message=>message.to==='fourth@example.invalid'));
 }finally{await db.close();}
});
test('unsubscribe tokens reject tampering',()=>{
 const secret='s'.repeat(32),token=unsubscribeToken('provider-user',secret);
 assert.equal(readUnsubscribeToken(token,secret),'provider-user');
 assert.equal(readUnsubscribeToken(token+'x',secret),null);
 assert.equal(readUnsubscribeToken(token,'bad'),null);
});

