import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {PostgresStore} from './postgres-store.mjs';
import * as runner from './backfill-run.mjs';
import {adapter} from './adapters/il-chicago.mjs';
test('backfill publication requires serving code and preserves unaffected authority with exact repeat import',async()=>{
 assert.equal(typeof runner.runBackfills,'function');const db=new PGlite();const client={query:(s,p)=>p?db.query(s,p):db.exec(s).then(r=>r.at(-1)),release(){}};const store=new PostgresStore({...client,connect:async()=>client});
 try{await store.migrate();const raw={inspection_id:'1',license_:'123',dba_name:'Synthetic',address:'1 Example St',city:'CHICAGO',state:'IL',inspection_date:'2026-10-01T00:00:00.000',results:'Pass'};
 const snapshot={rows:[adapter.normalize(raw)],scope:{type:'all'},revision:'1',urls:[],sourceRowCount:1,quarantine:[]};
 const options={releaseId:'synthetic',ids:['il-chicago'],verifyServing:async()=>true,createSource:()=>({snapshot:async()=>snapshot})};
 await assert.rejects(runner.runBackfills(store,{...options,verifyServing:async()=>false}),/serving/);
 const result=await runner.runBackfills(store,options);assert.equal(result.failures.length,0);assert.equal(result.sources[0].repeatChanged,0);assert.equal(result.kingCountyUnchanged,true);
 assert.equal((await store.catalog()).find(j=>j.id==='il-chicago').coverageStatus,'available');assert.equal((await db.query('SELECT * FROM nf_preview.backfill_backups')).rows.length,1);
 }finally{await db.close();}
});
