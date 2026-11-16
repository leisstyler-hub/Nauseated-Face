import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizedNeonSession, accessRequest, sendAccessEmail } from './admin-neon.mjs';
import { PGlite } from '@electric-sql/pglite';
import { ACCESS_SCHEMA, inviteAdministrator, recoverAdministrator } from './admin-neon.mjs';

test('public Neon signup and unverified email never establish owner access', async () => {
  let queried = false;
  const database = { query: async () => { queried = true; return { rows: [] }; } };
  assert.equal(await authorizedNeonSession(database, { user: { id: 'public', email: 'x@example.test', emailVerified: false } }), null);
  assert.equal(queried, false);
  assert.equal(await authorizedNeonSession(database, { user: { id: 'public', email: 'x@example.test', emailVerified: true } }), null);
});

test('invitation writes require an owner and same-origin JSON', async () => {
  const req = origin => new Request('https://example.test/api/admin/invitations', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Test', email: 'test@example.test' }) });
  let invoked = false;
  const run = async () => { invoked = true; return {}; };
  assert.equal((await accessRequest(req('https://example.test'), null, run)).status, 401);
  assert.equal((await accessRequest(req('https://evil.test'), { user: { role: 'owner' } }, run)).status, 403);
  assert.equal(invoked, false);
});

test('provider rejection is never reported as an email sent', async () => {
  const fetcher = async () => new Response('{}', { status: 403 });
  await assert.rejects(sendAccessEmail({ email: 'test@example.test', name: 'Test', origin: 'https://example.test', baseURL: 'https://provider.test/auth', fetcher }), /email/);
});

test('administrator invitations require an explicit Admin check', async () => {
  let calls = 0;
  const invite = async () => { calls++; return { status: 200, body: { sent: true } }; };
  for (const admin of [undefined, false, 'true']) {
    const request = new Request('https://example.test/api/admin/invitations', { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Invited', email: 'invited@example.test', admin }) });
    assert.equal((await accessRequest(request, { user: { id: 'owner', role: 'owner' } }, invite)).status, 400);
  }
  assert.equal(calls, 0);
  const request = new Request('https://example.test/api/admin/invitations', { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Invited', email: 'invited@example.test', admin: true }) });
  assert.equal((await accessRequest(request, { user: { id: 'owner', role: 'owner' } }, invite)).status, 200);
  assert.equal(calls, 1);
});

test('real grants require verified identity, pin it, expire unused invitations and respect revocation', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE "user"(id text,name text,email text,role text); ${ACCESS_SCHEMA}`);
    const database = { query: (sql, args) => db.query(sql, args) };
    await db.query('INSERT INTO admin_access_grants(email,name,invited_by) VALUES($1,$2,$3)', ['invited@example.test', 'Invited', 'owner']);
    const session = { user: { id: 'provider-one', email: 'invited@example.test', emailVerified: true } };
    assert.equal((await authorizedNeonSession(database, session)).user.role, 'owner');
    assert.equal(await authorizedNeonSession(database, { user: { ...session.user, id: 'provider-two' } }), null);
    await db.query('UPDATE admin_access_grants SET revoked_at=now() WHERE email=$1', [session.user.email]);
    assert.equal(await authorizedNeonSession(database, session), null);
    await db.exec("INSERT INTO admin_access_grants(email,name,invited_by,expires_at) VALUES('expired@example.test','Expired','owner',now()-interval '1 day')");
    assert.equal(await authorizedNeonSession(database, { user: { ...session.user, email: 'expired@example.test' } }), null);
    await db.exec("INSERT INTO \"user\" VALUES('legacy','Existing owner','owner@example.test','owner')");
    assert.equal((await authorizedNeonSession(database, { user: { ...session.user, id: 'legacy-neon', email: 'owner@example.test' } })).user.id, 'neon:legacy-neon');
  } finally { await db.close(); }
});

test('invitation rollback keeps failed sends from granting access; successful send is audited and throttled', async () => {
  const db = new PGlite();
  const client = { query: (sql, args) => db.query(sql, args), release() {} };
  const database = { connect: async () => client };
  try {
    await db.exec(`${ACCESS_SCHEMA} CREATE TABLE admin_control_runs(id text,actor_id text,action text,finished_at timestamptz,status text,summary jsonb)`);
    const values = { database, actor: 'owner', name: 'Invited', email: 'invited@example.test', origin: 'https://example.test', baseURL: 'https://provider.test/auth' };
    assert.equal((await inviteAdministrator({ ...values, send: async () => { throw Error('offline'); } })).status, 503);
    assert.equal((await db.query('SELECT * FROM admin_access_grants')).rows.length, 0);
    assert.equal((await inviteAdministrator({ ...values, send: async () => {} })).status, 200);
    assert.equal((await db.query('SELECT * FROM admin_control_runs')).rows.length, 1);
    assert.equal((await inviteAdministrator({ ...values, send: async () => { throw Error('must not send'); } })).status, 429);
  } finally { await db.close(); }
});

test('recovery provisions only existing approved accounts and throttles public requests', async () => {
  const db = new PGlite();
  try {
    await db.exec(`${ACCESS_SCHEMA} CREATE TABLE "user"(email text,name text,role text); INSERT INTO "user" VALUES('owner@example.test','Owner','owner')`);
    const database = { query: (sql, args) => db.query(sql, args) };
    let sent = 0;
    const values = { database, origin: 'https://example.test', baseURL: 'https://provider.test/auth', send: async () => { sent++; } };
    assert.equal((await recoverAdministrator({ ...values, email: 'unknown@example.test', ip: 'a' })).status, 200);
    assert.equal(sent, 0);
    assert.equal((await recoverAdministrator({ ...values, email: 'owner@example.test', ip: 'b' })).status, 200);
    assert.equal(sent, 1);
    assert.equal((await recoverAdministrator({ ...values, email: 'owner@example.test', ip: 'c' })).status, 429);
    assert.equal(sent, 1);
  } finally { await db.close(); }
});
