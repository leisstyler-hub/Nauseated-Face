import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { getMigrations } from 'better-auth/db/migration';
import { createAdminAuth, ownerSession } from './admin-auth.mjs';
import { migrateAdmin, migrationConfig, handleAdminRequest, verifyPnw } from './admin-migration.mjs';

test('migration configuration fails closed and requires exactly two distinct approved emails', () => {
  assert.equal(migrationConfig({}), null);
  assert.throws(() => migrationConfig({ NF_ADMIN_MIGRATION_ENABLED: 'yes' }), /configuration/);
});

test('verified legacy credentials create a Neon-compatible owner atomically without overwriting accounts', async () => {
  const db = new PGlite();
  const client = { query: async (sql, params) => { const r = await db.query(sql, params); return { ...r, rowCount: r.affectedRows }; }, release() {} };
  const database = { ...client, connect: async () => client, end: async () => {} };
  const auth = createAdminAuth({ database, secret: 'synthetic-test-secret-of-at-least-32-bytes', baseURL: 'http://localhost:3000' });
  try {
    await (await getMigrations(auth.options)).runMigrations();
    await db.exec('CREATE TABLE admin_account_migrations (source_user_id text PRIMARY KEY, user_id text UNIQUE NOT NULL REFERENCES "user"(id), email text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now())');
    const config = { emails: ['owner@example.test', 'second@example.test'] };
    let verifications = 0;
    const verify = async () => { verifications++; return { id: 'source-owner', email: 'owner@example.test', email_confirmed_at: '2026-01-01' }; };
    const credentials = { email: 'OWNER@example.test', password: 'legacy-pass' };
    assert.equal(await migrateAdmin({ database, config, credentials: { ...credentials, email: 'intruder@example.test' }, verify }), false);
    assert.equal(verifications, 0);
    await assert.rejects(migrateAdmin({ database, config, credentials, verify: async () => { throw Error('source unavailable'); } }));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM "user"')).rows[0].n, 0);
    assert.equal(await migrateAdmin({ database, config, credentials, verify: async () => ({ id: 'unconfirmed', email: 'owner@example.test' }) }), false);
    assert.equal(await migrateAdmin({ database, config, credentials, verify: async () => ({ id: 'wrong', email: 'second@example.test', email_confirmed_at: 'yes' }) }), false);
    assert.equal(await migrateAdmin({ database, config, credentials, verify }), true);
    assert.equal(await migrateAdmin({ database, config, credentials, verify }), false);
    assert.equal(verifications, 1);
    const login = await auth.api.signInEmail({ body: { email: 'owner@example.test', password: credentials.password }, asResponse: true });
    assert.equal(login.status, 200);
    const headers = new Headers({ cookie: login.headers.get('set-cookie').split(';')[0] });
    assert.equal((await ownerSession(auth, headers)).user.role, 'owner');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM admin_account_migrations')).rows[0].n, 1);
    // Force a lineage conflict after the user/account inserts; all inserts roll back.
    await assert.rejects(migrateAdmin({ database, config, credentials: { email: 'second@example.test', password: 'legacy-pass' }, verify: async () => ({ id: 'source-owner', email: 'second@example.test', email_confirmed_at: 'yes' }) }));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM "user"')).rows[0].n, 1);
    const request = new Request('http://localhost:3000/api/auth/sign-in/email', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' }, body: JSON.stringify({ email: 'second@example.test', password: 'second-legacy' }) });
    const migratedLogin = await handleAdminRequest(request, auth, credentials => migrateAdmin({ database, config, credentials, verify: async () => ({ id: 'source-second', email: 'second@example.test', email_confirmed_at: 'yes' }) }));
    assert.equal(migratedLogin.status, 200);
    assert.equal((await ownerSession(auth, new Headers({ cookie: migratedLogin.headers.get('set-cookie').split(';')[0] }))).user.email, 'second@example.test');
  } finally { await db.close(); }
});

test('provider verification reads authoritative identity and revokes only its temporary session', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('/token?')) return Response.json({ access_token: 'synthetic-token' });
    if (url.endsWith('/user')) return Response.json({ id: 'source-owner', email: 'owner@example.test' });
    return new Response(null, { status: 204 });
  };
  const identity = await verifyPnw({ url: 'https://synthetic.supabase.co', key: 'synthetic-public-key' }, { email: 'owner@example.test', password: 'synthetic-password' }, fetcher);
  assert.equal(identity.id, 'source-owner');
  assert.equal(calls.length, 3);
  assert.match(calls[2].url, /logout\?scope=local$/);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer synthetic-token');
});

test('migration cannot bypass handler rejection, origin checks or rate limits', async () => {
  for (const status of [200, 400, 403, 429, 503]) {
    let called = false;
    const request = new Request('https://example.test/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email: 'owner@example.test', password: 'synthetic' }) });
    const result = await handleAdminRequest(request, { handler: async () => new Response(null, { status }) }, async () => { called = true; });
    assert.equal(result.status, status);
    assert.equal(called, false);
  }
  const request = new Request('https://example.test/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email: 'owner@example.test', password: 'synthetic' }) });
  const result = await handleAdminRequest(request, { handler: async () => new Response(null, { status: 401 }) }, async () => { throw Error('failed import'); });
  assert.equal(result.status, 401);
});
