import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { PostgresStore, importPostgres } from './postgres-store.mjs';
import { prepareProductionRelease } from './production-release.mjs';
import * as release from './production-release.mjs';

test('feed activation backs up prior state, publishes only validated sources and leaves King County intact', async () => {
  assert.equal(typeof release.activateValidatedFeeds, 'function', 'validated activation runner is required');
  const db = new PGlite();
  const client = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(r => r.at(-1)), release() {} };
  const store = new PostgresStore({ ...client, connect: async () => client });
  const row = { ':id':'r1',business_id:'b1',inspection_serial_num:'i1',inspection_date:'2026-11-01',name:'Fixture Diner',address:'1 Example St',city:'Chicago',zip_code:'60601',inspection_result:'Pass' };
  try {
    await store.migrate();
    await importPostgres(store,{snapshot:async scope=>({rows:[{...row,city:'Seattle'}],scope,revision:'fixture',urls:[]})},{type:'all'});
    const kingBefore=JSON.stringify((await db.query("SELECT * FROM nf_preview.source_rows WHERE jurisdiction_id='wa-king'")).rows);
    const records=Array.from({length:25},(_,i)=>({...row,':id':`row-${i}`,inspection_serial_num:`event-${i}`}));
    const result=await release.activateValidatedFeeds(store,{releaseId:'fixture-release',ids:['il-chicago'],verifyServing:async()=>true,createSource:()=>({snapshot:async scope=>({rows:records,scope,revision:'fixture',urls:[]})})});
    assert.equal(result.sources[0].rawParity,true);
    assert.equal(result.sources[0].repeatChanged,0);
    assert.equal((await store.searchEstablishments({q:'Fixture',jurisdictionId:'il-chicago'})).length,1);
    assert.equal((await store.catalog()).find(j=>j.id==='il-chicago').coverageStatus,'limited');
    const [backup]=(await db.query('SELECT * FROM nf_preview.feed_activation_backups')).rows;
    assert.equal(backup.previous_catalog.enabled,false);
    assert.deepEqual(backup.source_rows,[]);
    assert.equal(JSON.stringify((await db.query("SELECT * FROM nf_preview.source_rows WHERE jurisdiction_id='wa-king'")).rows),kingBefore);
    const failed=await release.activateValidatedFeeds(store,{releaseId:'failed-source',ids:['ny-nyc'],verifyServing:async()=>true,createSource:()=>({snapshot(){throw new Error('Offline');}})});
    assert.equal(failed.failures.length,1);
    assert.equal((await store.catalog()).find(j=>j.id==='ny-nyc').enabled,false);
    assert.equal((await db.query("SELECT status FROM nf_preview.feed_activation_backups WHERE release_id='failed-source'")).rows[0].status,'error');
    const empty=await release.activateValidatedFeeds(store,{releaseId:'empty-source',ids:['ny-nyc'],verifyServing:async()=>true,createSource:()=>({snapshot:async scope=>({rows:[],scope,revision:'fixture',urls:[]})})});
    assert.equal(empty.sources.length,0);
    assert.equal(empty.failures.length,1);
    let fetches=0;
    const emptyFresh=await release.activateValidatedFeeds(store,{releaseId:'empty-fresh',ids:['il-chicago'],verifyServing:async()=>true,createSource:()=>({snapshot:async scope=>({rows:++fetches===1?records:[],scope,revision:'fixture',urls:[]})})});
    assert.equal(emptyFresh.failures.length,1);
    assert.equal(emptyFresh.sources.length,0);
    await assert.rejects(release.activateValidatedFeeds(store,{releaseId:'not-serving',ids:['il-chicago'],verifyServing:async()=>false}),/serving/);
    await assert.rejects(release.activateValidatedFeeds(store,{releaseId:'bad',ids:['wa-king']}),/activation/);
  } finally { await db.close(); }
});

test('activation verifies the public deployment SHA and all required adapters before database access',async()=>{
 assert.equal(typeof release.verifyProductionServing,'function');
 await assert.rejects(release.verifyProductionServing('expected',['il-chicago'],async()=>Response.json({commitSha:'old',adapterIds:['il-chicago']})),/serving/);
 await assert.rejects(release.verifyProductionServing('expected',['il-chicago'],async()=>Response.json({commitSha:'expected',adapterIds:['wa-king']})),/adapter/);
 assert.equal(await release.verifyProductionServing('expected',['il-chicago'],async()=>Response.json({commitSha:'expected',adapterIds:['wa-king','il-chicago']})),true);
});

test('release preparation preserves previous raw revisions and only refreshes King County before promotion', async () => {
  const db = new PGlite();
  const client = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(r => r.at(-1)), release() {} };
  const store = new PostgresStore({ ...client, connect: async () => client });
  const old = { ':id': 'release-row', business_id: 'release-business', inspection_serial_num: 'release-event', inspection_date: '2026-11-14', name: 'Original Name' };
  const source = rows => ({ snapshot: async scope => ({ rows, scope, revision: 'synthetic', urls: [] }) });
  try {
    await store.migrate();
    await importPostgres(store, source([old]), { type: 'latest', limit: 100 });
    const result = await prepareProductionRelease(store, source([{ ...old, name: 'Corrected Name' }]));
    assert.equal(result.preservedRevisions, 1);
    assert.equal(result.kingImport.rowCount, 1);
    assert.equal((await db.query("SELECT count(*) AS n FROM nf_preview.inspections WHERE jurisdiction_id <> 'wa-king'")).rows[0].n, 0);
    assert.equal((await db.query('SELECT count(*) AS n FROM nf_preview.row_revisions')).rows[0].n, 2);
    assert.equal((await store.searchEstablishments({ q: 'Corrected' })).length, 1);
    await assert.rejects(prepareProductionRelease(store, { snapshot: async () => { throw Error('Unavailable'); } }));
    assert.equal((await store.searchEstablishments({ q: 'Corrected' })).length, 1);
  } finally { await db.close(); }
});
