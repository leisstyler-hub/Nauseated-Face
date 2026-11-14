import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, eventId, importSource, Source, handleRead } from './index.mjs';

const row = (id, overrides = {}) => ({ ':id': id, business_id: 'B1', inspection_serial_num: 'I1', inspection_date: '2026-11-01T00:00:00.000', name: 'Official Name', inspection_closed_business: 'No', violation_description: 'Finding', violation_points: '5', ...overrides });
const source = (rows, scope = { type: 'all' }) => ({ snapshot: async () => ({ rows, scope, revision: '123', urls: ['https://data.kingcounty.gov/resource/r878-4sxa.json'] }) });
const store = () => new Store(new DatabaseSync(':memory:'));

test('repeat imports preserve rows and revisions without duplicates', async () => {
  const s = store();
  await importSource(s, source([row('r1'), row('r2')]));
  await importSource(s, source([row('r1'), row('r2')]));
  assert.equal(s.detail(eventId('B1', 'I1')).rows.length, 2);
  assert.equal(s.db.prepare('select count(*) n from row_revisions').get().n, 2);
  assert.equal(s.db.prepare('select count(*) n from violations').get().n, 2);
  s.close();
});

test('changes and removed rows are traceable while current grouping updates', async () => {
  const s = store();
  await importSource(s, source([row('r1'), row('r2')]));
  await importSource(s, source([row('r1', { violation_points: '10' })]));
  const d = s.detail(eventId('B1', 'I1'));
  assert.equal(d.violations.length, 1);
  assert.equal(d.rows[0].violation_points, '10');
  assert.equal(d.revisions.length, 3);
  assert.equal(s.db.prepare('select count(*) n from row_changes where action=?').get('removed').n, 1);
  s.close();
});

test('failures retain last good data and expose error; empty store is stale', async () => {
  const s = store();
  assert.equal(s.status().stale, true);
  await importSource(s, source([row('r1')]));
  await assert.rejects(importSource(s, { snapshot: async () => { throw new Error('HTTP 429'); } }));
  assert.equal(s.latest(10, 0).length, 1);
  assert.match(s.status().error, /429/);
  assert.ok(s.status().lastSuccess);
  s.close();
});

test('invalid or conflicting source rows abort atomically', async () => {
  const s = store();
  await importSource(s, source([row('r1')]));
  await assert.rejects(importSource(s, source([row('r2'), row('r3', { business_id: '' })])));
  assert.equal(s.latest(10, 0)[0].rowCount, 1);
  await assert.rejects(importSource(s, source([row('r1'), row('r1')])));
  s.close();
});

test('business coverage is scoped and missing inspection gives 404', async () => {
  const s = store();
  await importSource(s, source([row('r1')], { type: 'latest', limit: 1 }));
  assert.equal(s.history('B1', 10, 0).complete, false);
  await importSource(s, source([row('r1')], { type: 'business', businessId: 'B1' }));
  assert.equal(s.history('B1', 10, 0).complete, true);
  assert.equal((await handleRead(s, new Request('http://localhost/api/inspections/missing'))).status, 404);
  assert.equal((await handleRead(s, new Request('http://localhost/api/inspections?limit=1000'))).status, 400);
  s.close();
});

test('source paginates complete events and aborts when dataset changes', async () => {
  const urls = [];
  let revision = 1;
  const fetcher = async (url) => {
    urls.push(url);
    const u = new URL(url);
    if (u.pathname.includes('/api/views/')) return Response.json({ rowsUpdatedAt: revision });
    if (u.searchParams.get('$select')?.startsWith('business_id')) return Response.json([{ business_id: 'B1', inspection_serial_num: 'I1', latest_date: '2026' }]);
    const offset = Number(u.searchParams.get('$offset') || 0);
    return Response.json(offset === 0 ? [row('r1'), row('r2')] : offset === 2 ? [row('r3')] : []);
  };
  const client = new Source({ fetcher, pageSize: 2 });
  const snap = await client.snapshot({ type: 'latest', limit: 1 });
  assert.equal(snap.rows.length, 3);
  assert.ok(urls.some(u => new URL(u).searchParams.get('$offset') === '2'));
  let calls = 0;
  const unstable = new Source({ fetcher: async u => { if (u.includes('/api/views/')) revision = ++calls; return fetcher(u); }, pageSize: 2 });
  await assert.rejects(unstable.snapshot({ type: 'latest', limit: 1 }), /changed/);
});

test('429 retries are bounded and permanent failures are not retried', async () => {
  let calls = 0;
  const client = new Source({ fetcher: async () => { calls++; return new Response('', { status: 429, headers: { 'retry-after': '0' } }); }, sleep: async () => {} });
  await assert.rejects(client.json('https://data.kingcounty.gov/resource/r878-4sxa.json'), /429/);
  assert.equal(calls, 4);
  calls = 0;
  const permanent = new Source({ fetcher: async () => { calls++; return new Response('', { status: 400 }); } });
  await assert.rejects(permanent.json('https://data.kingcounty.gov/resource/r878-4sxa.json'), /400/);
  assert.equal(calls, 1);
});

test('a scoped import cannot silently leave a moved row in a partial old event', async () => {
  const s = store();
  await importSource(s, source([row('r1'), row('r2')]));
  await assert.rejects(importSource(s, source([row('r1', { inspection_serial_num: 'I2' })], { type: 'latest', limit: 1 })), /moved/);
  assert.equal(s.detail(eventId('B1', 'I1')).rows.length, 2);
  s.close();
});

test('item freshness does not become fresh after unrelated scoped import', async () => {
  const s = store();
  await importSource(s, source([row('r1')]));
  s.db.prepare("UPDATE refresh_runs SET finished_at='2000-01-01T00:00:00.000Z'").run();
  await importSource(s, source([row('r2', { business_id: 'B2' })], { type: 'business', businessId: 'B2' }));
  assert.equal(s.status().stale, false);
  assert.equal(s.detail(eventId('B1', 'I1')).stale, true);
  s.close();
});

test('a provider repeating a full page aborts instead of looping indefinitely', async () => {
  const client = new Source({ pageSize: 1, fetcher: async () => Response.json([row('r1')]) });
  await assert.rejects(client.pages({ '$select': '*, :id' }, []), /repeated/);
});

test('new reader connections see committed records while import fetch is pending', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nf-read-test-'));
  const path = join(dir, 'test.sqlite');
  const writer = new Store(new DatabaseSync(path));
  await importSource(writer, source([row('r1')]));
  let release;
  const importing = importSource(writer, { snapshot: () => new Promise(resolve => { release = () => resolve({ rows: [row('r1'), row('r2')], scope: { type: 'all' }, revision: '124', urls: [] }); }) });
  let reader;
  const readerDb = new DatabaseSync(path);
  try {
    reader = new Store(readerDb);
    assert.equal(reader.latest(10, 0)[0].rowCount, 1);
  } finally {
    release();
    await importing;
    readerDb.close();
    writer.close();
    unlinkSync(path);
    rmdirSync(dir);
  }
});

test('a wholly removed event remains traceable through detail', async () => {
  const s = store();
  await importSource(s, source([row('r1')]));
  await importSource(s, source([]));
  const d = s.detail(eventId('B1', 'I1'));
  assert.equal(d?.active, false);
  assert.equal(d?.revisions.length, 1);
  assert.equal(d?.changes.at(-1).action, 'removed');
  assert.equal(s.latest(10, 0).length, 0);
  s.close();
});
