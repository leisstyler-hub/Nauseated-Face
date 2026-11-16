import { getMigrations } from 'better-auth/db/migration';
import { createAdminAuth, getAdminAuth } from './admin-auth.mjs';

const EMAIL = 'nf-preview-validation@example.test';
const NAME = 'PREVIEW VALIDATION ONLY';
// Dedicated lifecycle for a temporary synthetic account. Never callable in
// production; owner provisioning uses the separate operator command.
export async function adminPilot(action, password, env = process.env) {
  if (env.VERCEL_ENV !== 'preview' || env.NF_PILOT_VERIFIED !== 'yes') throw new Error('Preview only');
  const configured = getAdminAuth(env);
  if (!configured) throw new Error('Preview auth is not configured');
  const database = configured.options.database;
  await database.query('CREATE SCHEMA IF NOT EXISTS nf_admin_preview');
  await (await getMigrations(configured.options)).runMigrations();
  const existing = await database.query('SELECT id,name FROM "user" WHERE email=$1', [EMAIL]);
  if (action === 'cleanup') {
    const user = existing.rows[0];
    if (user) {
      if (user.name !== NAME) throw new Error('Validation account marker mismatch');
      const client = await database.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM "session" WHERE "userId"=$1', [user.id]);
        await client.query('DELETE FROM "account" WHERE "userId"=$1', [user.id]);
        await client.query('DELETE FROM "user" WHERE id=$1 AND name=$2', [user.id, NAME]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }
    return { temporaryAccountRemoved: true };
  }
  if (action !== 'setup' || typeof password !== 'string' || password.length < 32 || password.length > 128 || existing.rows.length) throw new Error('Invalid validation setup');
  const provisioner = createAdminAuth({ database, secret: env.BETTER_AUTH_SECRET, baseURL: configured.options.baseURL, provision: true });
  const created = await provisioner.api.signUpEmail({ body: { name: NAME, email: EMAIL, password } });
  await database.query('UPDATE "user" SET role=$1 WHERE id=$2', ['owner', created.user.id]);
  return { temporaryAccountCreated: true, email: EMAIL };
}
