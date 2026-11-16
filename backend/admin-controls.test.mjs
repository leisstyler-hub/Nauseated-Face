import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { controlRequest, runAdminRefresh, applyAvailabilityChange, jurisdictionRequest, CONTROL_SCHEMA } from './admin-controls.mjs';

test('admin controls reject anonymous, cross-origin and unknown actions before any refresh', async () => {
  let calls = 0;
  const run = async () => { calls++; return {}; };
  const req = (origin, action = 'refresh') => new Request('https://example.test/api/admin/controls', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
  assert.equal((await controlRequest(req('https://example.test'), null, run)).status, 401);
  assert.equal((await controlRequest(req('https://intruder.test'), { user: { id: 'owner', role: 'owner' } }, run)).status, 403);
  assert.equal((await controlRequest(req('https://example.test'), { user: { id: 'viewer', role: 'viewer' } }, run)).status, 401);
  assert.equal((await controlRequest(req('https://example.test', 'delete'), { user: { id: 'owner', role: 'owner' } }, run)).status, 400);
  assert.equal(calls, 0);
});

test('manual refresh records the actor and outcome, throttles repeats, and retains failure audit', async () => {
  const db = new PGlite();
  const client = { query: async (sql, params) => { const result = await db.query(sql, params); return { ...result, rowCount: result.affectedRows }; }, release() {} };
  const database = { ...client, connect: async () => client };
  try {
    await db.exec(CONTROL_SCHEMA);
    const result = await runAdminRefresh(database, 'owner-id', async () => ({ sources: [{ jurisdictionId: 'wa-king', rowCount: 100 }], failures: [] }));
    assert.equal(result.status, 200);
    const row = (await db.query('SELECT * FROM admin_control_runs')).rows[0];
    assert.equal(row.actor_id, 'owner-id');
    assert.equal(row.status, 'success');
    assert.equal((await runAdminRefresh(database, 'owner-id', () => { throw Error('must not run'); })).status, 429);
    await db.exec("UPDATE admin_control_runs SET started_at=now()-interval '2 minutes'");
    assert.equal((await runAdminRefresh(database, 'owner-id', async () => { throw Error('private error'); })).status, 503);
    const failed = (await db.query("SELECT * FROM admin_control_runs WHERE status='error'")).rows[0];
    assert.ok(failed.finished_at);
    assert.equal(JSON.stringify(failed).includes('private error'), false);
    await db.exec("UPDATE admin_control_runs SET started_at=now()-interval '2 minutes'");
    const partial = await runAdminRefresh(database, 'owner-id', async () => ({ sources: [], failures: [{ jurisdictionId: 'synthetic' }] }));
    assert.equal(partial.status, 200);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM admin_control_runs WHERE status='partial'")).rows[0].n, 1);
  } finally { await db.close(); }
});

test('an active refresh lock rejects another control action without executing it', async () => {
  let released = false;
  const client = { query: async () => ({ rows: [{ locked: false }] }), release() { released = true; } };
  const result = await runAdminRefresh({ connect: async () => client }, 'owner-id', async () => { throw Error('must not run'); });
  assert.equal(result.status, 409);
  assert.equal(released, true);
});

test('availability request rejects anonymous, cross-origin, non-owner and malformed payloads before any write', async () => {
  let calls = 0;
  const apply = async () => { calls++; return { status: 200, body: {} }; };
  const req = (origin, body) => new Request('https://example.test/api/admin/jurisdictions', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const owner = { user: { id: 'owner', role: 'owner' } };
  const ok = { action: 'set-availability', jurisdictionId: 'wa-king', enabled: false };
  assert.equal((await jurisdictionRequest(req('https://example.test', ok), null, apply)).status, 401);
  assert.equal((await jurisdictionRequest(req('https://intruder.test', ok), owner, apply)).status, 403);
  assert.equal((await jurisdictionRequest(req('https://example.test', ok), { user: { id: 'v', role: 'viewer' } }, apply)).status, 401);
  assert.equal((await jurisdictionRequest(req('https://example.test', { action: 'wipe', jurisdictionId: 'wa-king', enabled: false }), owner, apply)).status, 400);
  assert.equal((await jurisdictionRequest(req('https://example.test', { action: 'set-availability', jurisdictionId: 'wa-king', enabled: 'no' }), owner, apply)).status, 400);
  assert.equal((await jurisdictionRequest(req('https://example.test', { action: 'set-availability', jurisdictionId: 'wa-king', enabled: false, extra: 1 }), owner, apply)).status, 400);
  assert.equal(calls, 0);
});

test('availability request forwards a valid owner payload to apply', async () => {
  const received = [];
  const apply = async (actor, id, enabled) => { received.push([actor, id, enabled]); return { status: 200, body: { jurisdictionId: id, enabled } }; };
  const req = new Request('https://example.test/api/admin/jurisdictions', { method: 'POST', headers: { Origin: 'https://example.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set-availability', jurisdictionId: 'wa-king', enabled: false }) });
  const result = await jurisdictionRequest(req, { user: { id: 'owner-7', role: 'owner' } }, apply);
  assert.equal(result.status, 200);
  assert.deepEqual(received, [['owner-7', 'wa-king', false]]);
});

test('availability change validates jurisdiction, applies the toggle and records one audit row', async () => {
  const db = new PGlite();
  try {
    await db.exec(CONTROL_SCHEMA);
    const adminDatabase = { query: (sql, params) => db.query(sql, params) };

    const unknown = await applyAvailabilityChange({ adminDatabase, setEnabled: async () => { throw Error('must not run'); }, actor: 'owner', jurisdictionId: 'xx-nowhere', enabled: false });
    assert.equal(unknown.status, 404);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM admin_control_runs')).rows[0].n, 0);

    const missing = await applyAvailabilityChange({ adminDatabase, setEnabled: async () => false, actor: 'owner', jurisdictionId: 'wa-king', enabled: false });
    assert.equal(missing.status, 404);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM admin_control_runs')).rows[0].n, 0);

    let applied;
    const ok = await applyAvailabilityChange({ adminDatabase, setEnabled: async (id, value) => { applied = [id, value]; return true; }, actor: 'owner-9', jurisdictionId: 'wa-king', enabled: false });
    assert.equal(ok.status, 200);
    assert.deepEqual(applied, ['wa-king', false]);
    const row = (await db.query('SELECT * FROM admin_control_runs')).rows[0];
    assert.equal(row.actor_id, 'owner-9');
    assert.equal(row.action, 'availability');
    assert.equal(row.status, 'success');
    assert.deepEqual(row.summary, { jurisdictionId: 'wa-king', enabled: false });
    assert.ok(row.finished_at);
  } finally { await db.close(); }
});
