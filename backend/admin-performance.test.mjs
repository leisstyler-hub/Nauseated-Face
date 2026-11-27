import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { PostgresStore, importPostgres } from './postgres-store.mjs';

test('admin sections read only displayed data and retain full operations parity', async () => {
  const db = new PGlite();
  const calls = [];
  const client = { query: async (sql, params) => {
    calls.push(sql);
    return params ? db.query(sql, params) : db.exec(sql).then(r => r.at(-1));
  }, release() {} };
  const store = new PostgresStore({ ...client, connect: async () => client, end: async () => {} });
  try {
    await store.migrate();
    const scope = { type: 'all' };
    const row = { ':id':'perf-1',business_id:'perf-business',inspection_serial_num:'perf-inspection',inspection_date:'2026-11-25',name:'Synthetic performance fixture',inspection_score:'05.00' };
    await importPostgres(store, { snapshot: async () => ({rows:[row],scope,revision:'synthetic',urls:[]}) }, scope);
    await db.query("INSERT INTO nf_preview.refresh_runs(started_at,finished_at,status,scope,jurisdiction_id) VALUES('2026-11-26','2026-11-26','success','{}','wa-king'),('2026-11-27',null,'error','{}','wa-king')");
    const full = await store.operations();
    calls.length = 0;
    const counts = await store.inspectionCounts();
    assert.deepEqual(counts, full.counts);
    assert.deepEqual(counts, {establishments:1,inspections:1,source_rows:1,revisions:1});
    assert.equal(calls.length, 1);
    assert.ok(calls.every(sql => !/pg_database_size|GROUP BY jurisdiction_id|refresh_runs/.test(sql)));
    calls.length = 0;
    assert.deepEqual(await store.storageUsage(), full.storage);
    assert.equal(calls.length, 1);
    assert.ok(calls.every(sql => !/count\(\*\)|refresh_runs/.test(sql)));
    calls.length = 0;
    assert.deepEqual(await store.recentRuns(), full.runs);
    assert.equal(calls.length, 1);
    assert.ok(calls.every(sql => !/pg_database_size|establishments|inspections/.test(sql)));
    calls.length = 0;
    const sources = await store.sourceOperations();
    assert.deepEqual(sources, full.sources);
    assert.equal(calls.length, 3);
    assert.ok(calls.every(sql => !/pg_database_size|source_rows|row_revisions/.test(sql)));
    assert.equal(sources.find(source => source.id === 'wa-king').lastAttempt.status, 'error');
    assert.equal(sources.find(source => source.id === 'wa-king').lastSuccess, '2026-11-26');
  } finally { await db.close(); }
});
