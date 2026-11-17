import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {PostgresStore} from './postgres-store.mjs';
import * as module from './window-backfill.mjs';
test('monthly backfill resumes committed windows and proves full-source accounting only at completion',async()=>{
 assert.equal(typeof module.runWindowBackfill,'function');const db=new PGlite();const c={query:(s,p)=>p?db.query(s,p):db.exec(s).then(r=>r.at(-1)),release(){}};const store=new PostgresStore({...c,connect:async()=>c});
 try{await store.migrate();let fail=true;const calls=[];
 const source={snapshot:async scope=>{calls.push(scope.start);if(fail&&scope.start==='2026-11-01')throw Error('Interrupted');return {scope,revision:'1',sourceRowCount:1,quarantine:[],urls:[],rows:[{':id':scope.start,business_id:scope.start,inspection_serial_num:scope.start,inspection_date:scope.start,name:'Synthetic',address:'1 Example St',city:'Chicago'}]};}};
 const options={jurisdictionId:'il-chicago',revision:'1',rowCount:2,firstDate:'2026-10-01',lastDate:'2026-11-10',source,verifyRevision:async()=>true};
 await assert.rejects(module.runWindowBackfill(store,options),/Interrupted/);assert.equal((await store.catalog()).find(j=>j.id==='il-chicago').fullImportVerified,false);
 fail=false;calls.length=0;const result=await module.runWindowBackfill(store,options);assert.deepEqual(calls,['2026-11-01']);assert.equal(result.accepted,2);assert.equal(result.resumedWindows,1);assert.equal((await store.catalog()).find(j=>j.id==='il-chicago').fullImportVerified,true);
 await assert.rejects(module.runWindowBackfill(store,{...options,rowCount:3}),/accounting/);
 }finally{await db.close();}
});
