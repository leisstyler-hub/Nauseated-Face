import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SocrataInspectionSource } from './socrata.mjs';
import { adapter } from './adapters/il-chicago.mjs';

const native = { inspection_id: '12', license_: '987', dba_name: 'Example', aka_name: 'Alternate', address: '1 Test Ave', city: 'CHICAGO', state: 'IL', zip: '60601', inspection_date: '2026-11-01T00:00:00.000', results: 'Pass w/ Conditions', violations: '1. Original wording | 2. More wording' };
test('Chicago preserves all native fields and combined violations without manufacturing points', () => {
  const mapped = adapter.normalize(native);
  assert.deepEqual(mapped[':original'], native);
  assert.equal(mapped.inspection_result, native.results);
  assert.equal(mapped.violation_description, native.violations);
  assert.equal(mapped.inspection_score, undefined);
  assert.throws(() => adapter.normalize({ ...native, license_: '0' }), /identity/);
});
test('bounded Socrata snapshot orders and paginates inspections, retains revision, rejects changes', async () => {
  let revision = 1;
  const requests = [];
  const fetcher = async url => {
    const u = new URL(url); requests.push(u);
    if (u.pathname.includes('/api/views/')) return Response.json({ rowsUpdatedAt: revision++ });
    return Response.json(u.searchParams.get('$offset') === '0' ? [native] : []);
  };
  const source = new SocrataInspectionSource(adapter.config, { fetcher, pageSize: 1 });
  await assert.rejects(source.snapshot({ type: 'latest', limit: 2 }), /changed/);
  revision = 1;
  source.fetcher = async url => new URL(url).pathname.includes('/api/views/') ? Response.json({ rowsUpdatedAt: 1 }) : fetcher(url);
  const saved = await source.snapshot({ type: 'latest', limit: 2 });
  assert.equal(saved.rows.length, 1);
  assert.equal(saved.rows[0].inspection_id, '12');
  assert.ok(requests.some(u => u.searchParams.get('$order') === 'inspection_date DESC,inspection_id DESC'));
  await assert.rejects(source.snapshot({ type: 'all' }), /bounded/);
});
