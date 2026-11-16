import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { PostgresStore, importPostgres } from './postgres-store.mjs';
import { runPilot } from './pilot-run.mjs';

const row = (id, extra = {}) => ({ ':id': id, business_id: 'SYNTHETIC-B', inspection_serial_num: 'SYNTHETIC-I', inspection_date: '2026-01-01', inspection_score: '05.00', violation_points: '05', violation_description: 'Synthetic finding', ...extra });
const source = (rows, scope = { type: 'all' }) => ({ snapshot: async () => ({ rows, scope, revision: 'synthetic-1', urls: [] }) });

test('Postgres engine: repeat, revision, removal, restoration, coverage and recovery', async () => {
  const db = new PGlite();
  const client = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(results => results.at(-1)), release() {} };
  const pool = { ...client, connect: async () => client };
  const store = new PostgresStore(pool);
  try {
    await store.migrate();
    assert.equal((await store.status()).stale, true);
    const scope = { type: 'business', businessId: 'SYNTHETIC-B' };
    const first = await importPostgres(store, source([row('1'), row('2')], scope), scope);
    assert.equal(first.changedCount, 2);
    assert.equal((await importPostgres(store, source([row('1'), row('2')], scope), scope)).changedCount, 0);
    const [item] = await store.latest(10, 0);
    assert.equal(item.rowCount, 2);
    assert.equal(item.fields.inspection_score, '05.00');
    const feedRows = await store.feedRows([item.id]);
    assert.equal(feedRows.length, 2);
    assert.equal(JSON.parse(feedRows[0].raw_json).violation_points, '05');
    assert.equal((await store.history('SYNTHETIC-B', 10, 0)).complete, true);
    assert.equal((await store.history('OTHER', 10, 0)).complete, false);
    await importPostgres(store, source([row('1', { violation_points: '10' })], scope), scope);
    const detail = await store.detail(item.id);
    assert.equal(detail.rows[0].violation_points, '10');
    assert.equal(detail.revisions.length, 3);
    assert.equal(detail.changes.filter(c => c.action === 'removed').length, 1);
    await assert.rejects(importPostgres(store, source([row('1'), row('1')], scope), scope), /Duplicate/);
    assert.equal((await store.detail(item.id)).rows[0].violation_points, '10');
    assert.equal((await store.status()).error, 'Import failed; last committed snapshot retained');
    await importPostgres(store, source([], scope), scope);
    assert.equal((await store.detail(item.id)).active, false);
    assert.equal((await store.latest(10, 0)).length, 0);
    await importPostgres(store, source([row('1')], scope), scope);
    assert.equal((await store.detail(item.id)).changes.at(-1).action, 'restored');
    await assert.rejects(importPostgres(store, source([row('1', { inspection_serial_num: 'MOVED' })], { type: 'latest', limit: 1 }), { type: 'latest', limit: 1 }), /moved/);
    assert.equal((await store.detail(item.id)).rows.length, 1);
    const report = await runPilot(store, { snapshot: async scope => ({ rows: [row('1')], scope, revision: 'synthetic-2', urls: [] }) });
    assert.equal(report.acceptance.sqlRollbackRecovery, true);
    assert.equal(report.acceptance.unchangedReimport, true);
    const committed = async () => Promise.all(['source_rows', 'row_revisions', 'row_changes', 'inspections', 'violations'].map(async table => (await db.query(`SELECT to_jsonb(t) AS row FROM nf_preview.${table} t ORDER BY to_jsonb(t)::text`)).rows));
    const beforeFailure = await committed();
    await db.exec("CREATE FUNCTION nf_preview.fail_promotion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic promotion failure'; END $$; CREATE TRIGGER fail_promotion BEFORE INSERT ON nf_preview.violations FOR EACH ROW EXECUTE FUNCTION nf_preview.fail_promotion()");
    await assert.rejects(importPostgres(store, source([row('1', { violation_points: '99' })]), { type: 'all' }), /synthetic promotion/);
    assert.deepEqual(await committed(), beforeFailure);
    assert.equal((await store.status()).error, 'Import failed; last committed snapshot retained');
    await db.exec('DROP TRIGGER fail_promotion ON nf_preview.violations; DROP FUNCTION nf_preview.fail_promotion()');
  } finally { await db.close(); }
});
