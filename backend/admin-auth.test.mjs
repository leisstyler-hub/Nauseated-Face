import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { PGlite } from '@electric-sql/pglite';
import { getMigrations } from 'better-auth/db/migration';
import { createAdminAuth, ownerSession } from './admin-auth.mjs';

test('real admin sessions reject anonymous access, disable public signup, expire on logout, and require owner role', async () => {
  const database = new DatabaseSync(':memory:');
  const config = { database, secret: 'synthetic-test-secret-of-at-least-32-bytes', baseURL: 'http://localhost:3000' };
  const provisioner = createAdminAuth({ ...config, provision: true });
  await (await getMigrations(provisioner.options)).runMigrations();
  const created = await provisioner.api.signUpEmail({ body: { name: 'Test Owner', email: 'owner@example.test', password: 'synthetic-password-123456' } });
  const auth = createAdminAuth(config);
  assert.equal(await ownerSession(auth, new Headers()), null);
  await assert.rejects(auth.api.signUpEmail({ body: { name: 'Intruder', email: 'other@example.test', password: 'synthetic-password-123456', role: 'owner' } }));
  await assert.rejects(auth.api.signInEmail({ body: { email: 'owner@example.test', password: 'wrong-password' } }));
  const login = await auth.api.signInEmail({ body: { email: 'owner@example.test', password: 'synthetic-password-123456' }, asResponse: true });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
  const headers = new Headers({ cookie });
  assert.equal(await ownerSession(auth, headers), null);
  database.prepare('UPDATE "user" SET role=? WHERE id=?').run('owner', created.user.id);
  assert.equal((await ownerSession(auth, headers)).user.email, 'owner@example.test');
  await auth.api.signOut({ headers });
  assert.equal(await ownerSession(auth, headers), null);
  database.close();
});

test('admin auth rejects weak secrets and untrusted non-TLS origins', () => {
  assert.throws(() => createAdminAuth({ secret: 'short', baseURL: 'https://example.test' }), /secret/);
  assert.throws(() => createAdminAuth({ secret: 'long-enough-synthetic-secret-for-tests', baseURL: 'http://example.test' }), /HTTPS/);
});

test('anonymous owner checks do not initialize an unavailable auth schema', async () => {
  assert.equal(await ownerSession({ api: { getSession() { throw Error('Auth database not initialized'); } } }, new Headers()), null);
});

test('PostgreSQL auth schema supports actual HTTP handlers and owner session reads', async () => {
  const db = new PGlite();
  await db.exec('CREATE SCHEMA nf_admin_preview; SET search_path=nf_admin_preview');
  const client = { query: async (sql, params) => { const r = await db.query(sql, params); return { ...r, rowCount: r.affectedRows }; }, release() {} };
  const database = { ...client, connect: async () => client, end: async () => {} };
  try {
    const config = { database, secret: 'synthetic-test-secret-of-at-least-32-bytes', baseURL: 'http://localhost:3000' };
    const auth = createAdminAuth(config);
    await (await getMigrations(auth.options)).runMigrations();
    const response = await auth.handler(new Request('http://localhost:3000/api/auth/get-session'));
    assert.equal(response.status, 200);
    assert.equal(await ownerSession(auth, new Headers()), null);
  } finally { await db.close(); }
});
