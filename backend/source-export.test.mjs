import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {PostgresStore,importPostgres} from './postgres-store.mjs';
import {sourceExportResponse} from './source-export.mjs';
test('Marin export includes attribution, adapted records and originals but cannot export another authority',async()=>{
 const db=new PGlite();const c={query:(s,p)=>p?db.query(s,p):db.exec(s).then(r=>r.at(-1)),release(){}};const store=new PostgresStore({...c,connect:async()=>c,end(){}});
 try{await store.migrate();const row={':id':'r1',':original':{business_id:'1',inspection_id:'2',violation_description:'Exact source'},business_id:'b',inspection_serial_num:'2',inspection_date:'2026-10-01',name:'Synthetic',address:'1 Example St',city:'Novato'};
 await importPostgres(store,{snapshot:async scope=>({scope,rows:[row],revision:'1',urls:[]})},{type:'all'},'ca-marin');await db.query("UPDATE nf_preview.jurisdictions SET enabled=true,coverage_status='limited' WHERE id='ca-marin'");
 const response=await sourceExportResponse(store,'ca-marin');assert.equal(response.status,200);const data=(await response.text()).trim().split('\n').map(JSON.parse);assert.equal(data[0].license,'https://opendatacommons.org/licenses/odbl/1-0/');assert.equal(data[1].row[':original'].violation_description,'Exact source');
 assert.equal((await sourceExportResponse(store,'wa-king')).status,400);
 }finally{await db.close();}
});
