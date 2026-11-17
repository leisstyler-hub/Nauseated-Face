import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {PostgresStore} from './postgres-store.mjs';
import {syncEnabledSources} from './sync.mjs';
test('authority-scoped refresh collects a complete rolling window and records actual cron request evidence',async()=>{
 const db=new PGlite();const c={query:(s,p)=>p?db.query(s,p):db.exec(s).then(r=>r.at(-1)),release(){}};const store=new PostgresStore({...c,connect:async()=>c});
 try{await store.migrate();await db.query("UPDATE nf_preview.jurisdictions SET enabled=true WHERE id='il-chicago'");let calls=0;
 const result=await syncEnabledSources(store,()=>({snapshot:async scope=>{calls++;assert.equal(scope.type,'window');assert.equal(scope.start,'2026-10-03');assert.equal(scope.end,'2026-11-18');return {scope,revision:'1',urls:[],rows:[{':id':'1',business_id:'b',inspection_serial_num:'i',inspection_date:'2026-11-01',name:'Synthetic',address:'1 Example St',city:'Chicago'}]};}}),{jurisdictionId:'il-chicago',now:new Date('2026-11-17T05:00:00Z'),trigger:'vercel-cron',schedule:'25 12 * * *'});
 assert.equal(calls,1);assert.equal(result.failures.length,0);const run=(await store.recentRuns())[0];assert.equal(run.trigger_kind,'vercel-cron');assert.equal(run.request_meta.schedule,'25 12 * * *');
 }finally{await db.close();}
});
