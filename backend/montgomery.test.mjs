import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adapter } from './adapters/md-montgomery.mjs';
import { prepareSnapshot } from './postgres-pilot.mjs';
import { PGlite } from '@electric-sql/pglite';
import { PostgresStore, importPostgres } from './postgres-store.mjs';

const native = { registration_number: '123', inspection_number: '26-10', business_name: 'Synthetic', address: '1 Example St', city: 'Silver\u00a0Spring', state: 'MD', zip: '20910', inspection_start_date: '2026-11-12T00:00:00.000', status: 'Pass', rodents_and_insects: 'Not In Compliance', proper_hand_washing: 'In Compliance', location: { type: 'Point', coordinates: [-77.02, 38.99] } };

test('Montgomery retains distinct official rows in one complete inspection and repeat checklist findings', async () => {
  const records = ['row-a', 'row-b'].map(id => ({ ...native, ':id': id, rodents_and_insects: 'Not In Compliance Repeat Violation' }));
  const requests = [];
  const fetcher = async url => {
    const u = new URL(url); requests.push(u);
    if (u.pathname.includes('/api/views/')) return Response.json({ rowsUpdatedAt: 1 });
    if (u.searchParams.has('$group')) return Response.json([{ registration_number: '123', inspection_number: '26-10' }]);
    if (u.searchParams.get('$select') === 'count(*) AS count') return Response.json([{ count: '2' }]);
    return Response.json(records.slice(Number(u.searchParams.get('$offset') ?? 0), Number(u.searchParams.get('$offset') ?? 0) + Number(u.searchParams.get('$limit'))));
  };
  const scope = { type: 'latest', limit: 1 };
  const snapshot = await adapter.createSource({ fetcher, pageSize: 1 }).snapshot(scope);
  assert.equal(snapshot.rows.length, 2, 'one selected inspection must include both official rows');
  assert.deepEqual(snapshot.rows.map(r => r[':original']), records);
  assert.ok(snapshot.rows.every(r => r.violation_description === 'rodents_and_insects: Not In Compliance Repeat Violation'));
  const prepared = prepareSnapshot(snapshot, 'md-montgomery');
  assert.equal(prepared.events.size, 1);
  assert.equal(new Set(prepared.rows.map(r => r.sourceId)).size, 2);
  assert.ok(requests.some(u => u.searchParams.has('$where')), 'fetch all rows of selected event');
});
test('Montgomery preserves official checklist wording and result without inventing scores or severity', () => {
  const row = adapter.normalize(native);
  assert.deepEqual(row[':original'], native);
  assert.equal(row.city, 'Silver Spring');
  assert.equal(row.inspection_result, 'Pass');
  assert.equal(row.violation_description, 'rodents_and_insects: Not In Compliance');
  assert.equal(row.inspection_score, undefined);
  assert.equal(row.violation_type, undefined);
  assert.equal(adapter.establishment(row).latitude, 38.99);
  assert.throws(() => adapter.normalize({ ...native, registration_number: '' }), /identity/);
  assert.throws(() => adapter.normalize({ ...native, state: 'VA' }), /identity/);
  assert.equal(adapter.normalize({ ...native, proper_hand_washing: 'Corrected Onsite' }).violation_description, 'proper_hand_washing: Corrected Onsite\nrodents_and_insects: Not In Compliance');
  assert.throws(() => adapter.normalize({ ...native, rodents_and_insects: 'Unexpected new meaning' }), /checklist/);
});

test('Montgomery row identity upgrade retains event URLs, originals and repeat-import idempotence', async () => {
  const db = new PGlite();
  const client = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(results => results.at(-1)), release() {} };
  const store = new PostgresStore({ ...client, connect: async () => client });
  const scope = { type: 'latest', limit: 1 };
  const snapshot = rows => ({ snapshot: async () => ({ rows, scope, revision: 'fixture-1', urls: [] }) });
  try {
    await store.migrate();
    await importPostgres(store, snapshot([adapter.normalize(native)]), scope, 'md-montgomery');
    const [before] = await store.latest(10, 0, undefined, 'md-montgomery');
    const rows = ['a','b'].map(id => adapter.normalize({ ...native, ':id': id }));
    await importPostgres(store, snapshot(rows), scope, 'md-montgomery');
    const [after] = await store.latest(10, 0, undefined, 'md-montgomery');
    assert.equal(after.id, before.id);
    assert.equal(after.sourceUrl, before.sourceUrl);
    assert.equal(after.rowCount, 2);
    assert.equal((await importPostgres(store, snapshot(rows), scope, 'md-montgomery')).changedCount, 0);
    const detail = await store.detail(after.id);
    assert.equal(detail.revisions.length, 3, 'legacy row and both original source rows stay in history');
    const saved = JSON.stringify((await db.query('SELECT * FROM nf_preview.source_rows ORDER BY source_id')).rows);
    await assert.rejects(importPostgres(store, snapshot([rows[0], { ...rows[1], inspection_result: 'Conflicting' }]), scope, 'md-montgomery'), /Conflicting/);
    assert.equal(JSON.stringify((await db.query('SELECT * FROM nf_preview.source_rows ORDER BY source_id')).rows), saved);
  } finally { await db.close(); }
});
