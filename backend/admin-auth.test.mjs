import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
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
