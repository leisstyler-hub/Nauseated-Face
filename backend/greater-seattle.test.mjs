import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {PostgresStore,importPostgres} from './postgres-store.mjs';

test('city feed filters before limit, newest per business, and respects publication',async()=>{
 const db=new PGlite();const client={query:(sql,p)=>p?db.query(sql,p):db.exec(sql).then(r=>r.at(-1)),release(){}};const store=new PostgresStore({...client,connect:async()=>client,end:async()=>{}});
 try{
 await store.migrate();const rows=Array.from({length:520},(_,i)=>({':id':'row'+i,business_id:'b'+i,inspection_serial_num:'i'+i,inspection_date:'2026-11-12',name:'Original '+i,city:i===0?'Seattle':'Bellevue',inspection_score:'05.00',violation_points:'05',violation_description:'Original finding'}));
 const scope={type:'all'};const source={snapshot:async()=>({rows,scope,revision:'fixture',urls:[]})};
 const first=await importPostgres(store,source,scope);assert.equal(first.rowCount,520);assert.equal((await importPostgres(store,source,scope)).changedCount,0);
 const items=await store.homeFeed(1,'wa-king','Seattle');assert.equal(items.length,1);assert.equal(items[0].businessId,'b0');assert.equal((await store.detail(items[0].id)).rows[0].inspection_score,'05.00');
 assert.equal((await store.homeFeed(10,'wa-king','No such city')).length,0);
 assert.equal((await store.feedCoverage('Seattle')).inspections,1);
 assert.equal((await store.feedCoverage()).inspections,520);
 assert.equal((await store.homeFeed(1,'wa-king','','2026-11-01')).length,520,'Weekly ranking must not stop at the display limit');
 assert.equal((await store.homeFeed(1,'wa-king','','2026-11-13')).length,0);
 await store.setJurisdictionEnabled('wa-king',false);assert.equal((await store.homeFeed(10,'wa-king','Seattle')).length,0);
 assert.equal((await db.query('SELECT count(*)::int n FROM nf_preview.row_revisions')).rows[0].n,520);
 }finally{await db.close();}
});

import {resolveHomeArea} from './home-area.mjs';
test('area preferences resolve safely and region does not invent neighboring county coverage',()=>{
 const states=[{code:'WA',slug:'washington',cities:[{name:'Seattle',slug:'seattle',jurisdictionId:'wa-king',jurisdictionName:'King County',covered:true}]}];
 assert.equal(resolveHomeArea(states,'washington/seattle').city,'Seattle');
 assert.equal(resolveHomeArea(states,'washington/greater-seattle').city,'');
 assert.equal(resolveHomeArea(states,'washington/greater-seattle').covered,true);
 assert.match(resolveHomeArea(states,'washington/greater-seattle').description,/Does not include Pierce or Snohomish/);
 assert.equal(resolveHomeArea(states,'../../bad').key,'');
 assert.equal(resolveHomeArea(states).selected,false);
 assert.equal(resolveHomeArea(states).jurisdictionId,'');
 assert.equal(resolveHomeArea(states,'washington/seattle').selected,true);
 assert.equal(resolveHomeArea(states,'washington/greater-seattle').selected,true);
 assert.equal(resolveHomeArea([]).covered,false);
 const aliasStates=[{code:'WA',slug:'washington',cities:[{name:'SeaTac',slug:'seatac',jurisdictionId:'wa-king',covered:true}]}];
 assert.equal(resolveHomeArea(aliasStates,'washington/sea-tac').key,'washington/seatac');
});
