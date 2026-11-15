import pg from 'pg';
import { getMigrations } from 'better-auth/db/migration';
import { createAdminAuth } from './admin-auth.mjs';
import { directPilotUrl } from './postgres-store.mjs';
import { productionEnabled, savedStorageEnabled } from './production.mjs';

// Operator-only command. Passwords enter via environment, never command args.
if (!savedStorageEnabled() || process.env.NF_ADMIN_PROVISION_AUTHORIZED !== 'yes') throw new Error('Explicit verified environment and administrator provisioning opt-in required');
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_INITIAL_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD privately');
const schema = productionEnabled() ? 'nf_admin_production' : 'nf_admin_preview';
const pool = new pg.Pool({ connectionString: directPilotUrl(process.env), options: `-c search_path=${schema}`, max: 1 });
try {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  const auth = createAdminAuth({ database: pool, secret: process.env.BETTER_AUTH_SECRET, baseURL: process.env.BETTER_AUTH_URL, provision: true });
  await (await getMigrations(auth.options)).runMigrations();
  const owners = await pool.query('SELECT id FROM "user" WHERE role=$1', ['owner']);
  if (owners.rows.length) throw new Error('An owner already exists; provisioning stopped');
  const result = await auth.api.signUpEmail({ body: { name: 'Nauseated Face Owner', email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_INITIAL_PASSWORD } });
  await pool.query('UPDATE "user" SET role=$1 WHERE id=$2', ['owner', result.user.id]);
  console.log('Owner provisioned. Public registration remains disabled. Clear ADMIN_INITIAL_PASSWORD from the operator environment.');
} finally { await pool.end(); }
