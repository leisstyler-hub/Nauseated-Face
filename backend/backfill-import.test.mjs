import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {PostgresStore,importPostgres} from './postgres-store.mjs';
import {adapter} from './adapters/il-chicago.mjs';

const raw=(id,extra={})=>({':id':'official-'+id,inspection_id:id,license_:'123',address:'1 Synthetic St',dba_name:'Synthetic Cafe',city:'CHICAGO',state:'IL',zip:'60601',inspection_date:'2026-10-01T00:00:00.000',inspection_type:'Canvass',results:'Fail',violations:'Synthetic finding',...extra});
const scope={type:'all'};
const snapshot=(rows,quarantine=[])=>({rows:rows.map(adapter.normalize),scope,revision:'2',urls:[],quarantine,sourceRowCount:rows.length+quarantine.length});
test('full backfill retains rejected originals and prior valid records without inventing identities',async()=>{
 const db=new PGlite();const client={query:(sql,p)=>p?db.query(sql,p):db.exec(sql).then(r=>r.at(-1)),release(){}};const store=new PostgresStore({...client,connect:async()=>client});
 try{
 await store.migrate();const initial=snapshot([raw('1'),raw('2')]);await importPostgres(store,{snapshot:async()=>initial},scope,'il-chicago');
 const prior=await store.latest(100,0,undefined,'il-chicago');
 const rejected=raw('2',{license_:'0'});const full=snapshot([raw('1'),raw('3')],[{sourceId:'2',raw:rejected,reason:'Invalid license'}]);
 const result=await importPostgres(store,{snapshot:async()=>full},scope,'il-chicago');
 assert.equal(result.rejectedCount,1);assert.equal((await store.latest(100,0,undefined,'il-chicago')).length,3);
 assert.deepEqual((await store.detail(prior.find(r=>r.serial==='2').id)).rows,[adapter.normalize(raw('2'))]);
 const q=(await db.query('SELECT * FROM nf_preview.quarantined_rows WHERE active')).rows;assert.equal(q.length,1);assert.deepEqual(JSON.parse(q[0].raw_json),rejected);
 const catalog=(await store.catalog()).find(j=>j.id==='il-chicago');assert.equal(catalog.fullImportVerified,false);assert.equal(catalog.rejectedRowCount,1);
 assert.equal((await importPostgres(store,{snapshot:async()=>full},scope,'il-chicago')).changedCount,0);
 const fixed=snapshot([raw('1'),raw('2'),raw('3')]);await importPostgres(store,{snapshot:async()=>fixed},scope,'il-chicago');
 assert.equal((await db.query('SELECT * FROM nf_preview.quarantined_rows WHERE active')).rows.length,0);assert.equal((await store.catalog()).find(j=>j.id==='il-chicago').fullImportVerified,true);
 assert.equal((await db.query('SELECT * FROM nf_preview.quarantined_rows')).rows.length,1);
 }finally{await db.close();}
});
test('unaccounted source rows fail before changing committed records',async()=>{
 const db=new PGlite();const client={query:(sql,p)=>p?db.query(sql,p):db.exec(sql).then(r=>r.at(-1)),release(){}};const store=new PostgresStore({...client,connect:async()=>client});
 try{await store.migrate();const full=snapshot([raw('1')]);full.sourceRowCount=2;await assert.rejects(importPostgres(store,{snapshot:async()=>full},scope,'il-chicago'),/account/);assert.equal((await store.latest(100,0)).length,0);}
 finally{await db.close();}
});
test('a bounded window refresh reads only affected business history and keeps unrelated businesses intact',async()=>{
 const db=new PGlite();let measured=false,transferred=0;
 const client={query:async(sql,p)=>{const result=p?await db.query(sql,p):(await db.exec(sql)).at(-1);if(measured&&/SELECT \* FROM nf_preview.source_rows/.test(sql))transferred+=result.rows.length;return result;},release(){}};const store=new PostgresStore({...client,connect:async()=>client});
 try{await store.migrate();const originals=Array.from({length:30},(_,n)=>raw(String(n+1),{license_:String(n+1),dba_name:'Synthetic '+n,inspection_date:n===0?'2026-10-01T00:00:00.000':'2026-09-01T00:00:00.000'}));await importPostgres(store,{snapshot:async()=>snapshot(originals)},scope,'il-chicago');
 const window={type:'window',start:'2026-10-01',end:'2026-11-01'};const s={...snapshot([originals[0]]),scope:window};measured=true;await importPostgres(store,{snapshot:async()=>s},window,'il-chicago');measured=false;
 assert.ok(transferred<10,`Bounded refresh transferred ${transferred} source rows for one affected business`);assert.equal((await store.latest(100,0,undefined,'il-chicago')).length,30);
 const checkpoints=(await db.query('SELECT * FROM nf_preview.backfill_windows')).rows;assert.equal(checkpoints.length,1);assert.equal(checkpoints[0].source_row_count,1);
 }finally{await db.close();}
});
test('empty authoritative window retires deleted source events but retains raw revisions and outside history',async()=>{
 const db=new PGlite();const c={query:(s,p)=>p?db.query(s,p):db.exec(s).then(r=>r.at(-1)),release(){}};const store=new PostgresStore({...c,connect:async()=>c});
 try{await store.migrate();await importPostgres(store,{snapshot:async()=>snapshot([raw('1'),raw('2',{inspection_date:'2026-09-01T00:00:00.000'})])},scope,'il-chicago');
 const october=(await store.latest(10,0,undefined,'il-chicago')).find(r=>r.serial==='1');
 const window={type:'window',start:'2026-10-01',end:'2026-11-01'};await importPostgres(store,{snapshot:async()=>({...snapshot([]),scope:window})},window,'il-chicago');
 assert.equal((await store.latest(10,0,undefined,'il-chicago')).length,1);const original=await store.detail(october.id);assert.equal(original.active,false);assert.equal(original.revisions.length,1);
 }finally{await db.close();}
});
test('window refresh deactivates repaired quarantine entries without deleting the rejected original',async()=>{
 const db=new PGlite();const c={query:(s,p)=>p?db.query(s,p):db.exec(s).then(r=>r.at(-1)),release(){}};const store=new PostgresStore({...c,connect:async()=>c});
 try{await store.migrate();const window={type:'window',start:'2026-10-01',end:'2026-11-01'};
 const bad={...snapshot([],[{sourceId:'1',raw:raw('1',{license_:'0'}),reason:'Invalid license'}]),scope:window,revision:'1'};
 await importPostgres(store,{snapshot:async()=>bad},window,'il-chicago');await importPostgres(store,{snapshot:async()=>({...snapshot([raw('1')]),scope:window})},window,'il-chicago');
 const q=(await db.query('SELECT * FROM nf_preview.quarantined_rows')).rows;assert.equal(q.length,1);assert.equal(q[0].active,false);
 }finally{await db.close();}
});
