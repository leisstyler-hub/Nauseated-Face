import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { Source } from './source.mjs';
import { importPostgres } from './postgres-store.mjs';
import { withTransaction } from './postgres-pilot.mjs';

export async function rollbackProbe(pool) {
  let expectedFailure = false;
  let discard;
  const probePool = { connect: async () => {
    const client = await pool.connect();
    return { query: client.query.bind(client), release(error) { discard = error; client.release(error); } };
  } };
  await withTransaction(probePool, async client => {
    await client.query('UPDATE nf_preview.source_rows SET active=false');
    try { await client.query('SELECT nf_preview.deliberately_missing_recovery_probe()'); }
    catch (error) { expectedFailure = error.code === '42883'; throw error; }
  }).catch(error => { if (discard) throw discard; if (!expectedFailure) throw error; });
  // A failed rollback is discarded by withTransaction. State equality below is
  // still required; the missing-function error alone is not recovery evidence.
  if (!expectedFailure) throw new Error('Rollback probe did not exercise SQL failure');
}

async function committedState(pool) {
  return Promise.all(['source_rows', 'row_revisions', 'row_changes', 'inspections', 'violations'].map(async table =>
    (await pool.query(`SELECT to_jsonb(t) AS row FROM nf_preview.${table} t ORDER BY to_jsonb(t)::text`)).rows));
}

// Only bounded official scopes; failure tests never modify county records.
export async function runPilot(store, source = new Source()) {
  const started = performance.now();
  await store.migrate();
  const connection = await store.pool.query('SELECT current_schema() AS schema, version() AS version');
  const scope = { type: 'latest', limit: 5 };
  const snapshot = await source.snapshot(scope);
  const frozen = { snapshot: async () => snapshot };
  const firstStart = performance.now();
  const first = await importPostgres(store, frozen, scope);
  const firstMs = Math.round(performance.now() - firstStart);
  const repeatStart = performance.now();
  const repeat = await importPostgres(store, frozen, scope);
  assert.equal(repeat.changedCount, 0);
  const repeatMs = Math.round(performance.now() - repeatStart);
  const expectedIds = new Set(snapshot.rows.map(r => JSON.stringify([r.business_id, r.inspection_serial_num])));
  let comparedRows = 0;
  const items = await store.latest(100, 0);
  for (const item of items.filter(i => expectedIds.has(JSON.stringify([i.businessId, i.serial])))) {
    const detail = await store.detail(item.id);
    const expected = snapshot.rows.filter(r => r.business_id === item.businessId && r.inspection_serial_num === item.serial);
    assert.deepEqual(detail.rows.sort((a,b) => a[':id'].localeCompare(b[':id'])), expected.sort((a,b) => a[':id'].localeCompare(b[':id'])));
    comparedRows += detail.rows.length;
  }
  assert.equal(comparedRows, snapshot.rows.length);
  const businessId = snapshot.rows[0]?.business_id;
  assert.ok(businessId, 'No official rows available for business check');
  const businessScope = { type: 'business', businessId };
  const businessSnapshot = await source.snapshot(businessScope);
  const business = await importPostgres(store, { snapshot: async () => businessSnapshot }, businessScope);
  const history = await store.history(businessId, 100, 0);
  assert.equal(history.complete, true);
  let businessRows = 0;
  for (const item of history.items) {
    const detail = await store.detail(item.id);
    assert.deepEqual(detail.rows.sort((a,b) => a[':id'].localeCompare(b[':id'])), businessSnapshot.rows.filter(r => r.inspection_serial_num === item.serial).sort((a,b) => a[':id'].localeCompare(b[':id'])));
    businessRows += detail.rows.length;
  }
  assert.equal(businessRows, businessSnapshot.rows.length, 'Business history requires additional pagination');
  const before = await store.latest(100, 0);
  let rollbackExercised = false;
  await assert.rejects(importPostgres(store, { snapshot: async () => { throw new Error('Synthetic source failure'); } }, scope));
  assert.deepEqual(await store.latest(100, 0), before);
  // Force a real SQL transaction failure after an uncommitted row update.
  const committedBefore = await committedState(store.pool);
  await rollbackProbe(store.pool);
  assert.deepEqual(await committedState(store.pool), committedBefore);
  rollbackExercised = true;
  assert.equal(rollbackExercised, true);
  assert.deepEqual(await store.latest(100, 0), before);
  const storage = (await store.pool.query("SELECT pg_database_size(current_database())::text AS database_bytes, sum(pg_total_relation_size(c.oid))::text AS pilot_bytes, sum(pg_indexes_size(c.oid))::text AS index_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='nf_preview' AND c.relkind='r'")).rows[0];
  const counts = (await store.pool.query('SELECT (SELECT count(*) FROM nf_preview.source_rows)::int AS source_rows,(SELECT count(*) FROM nf_preview.row_revisions)::int AS revisions,(SELECT count(*) FROM nf_preview.row_changes)::int AS changes,(SELECT count(*) FROM nf_preview.refresh_runs)::int AS runs')).rows[0];
  return { postgresConnected: true, postgresVersion: connection.rows[0].version.split(' on ')[0], first, repeat, business, acceptance: { exactLatestRows: comparedRows, exactBusinessRows: businessRows, unchangedReimport: true, sourceFailureRecovery: true, sqlRollbackRecovery: true }, measurements: { firstImportMs: firstMs, repeatImportMs: repeatMs, totalMs: Math.round(performance.now() - started), ...storage, ...counts }, sourceUrls: [...new Set([...snapshot.urls, ...businessSnapshot.urls])] };
}
