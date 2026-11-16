import pg from 'pg';
import { getMigrations } from 'better-auth/db/migration';
import { createAdminAuth } from './admin-auth.mjs';
import { directPilotUrl } from './postgres-store.mjs';
import { productionEnabled, savedStorageEnabled } from './production.mjs';
import { migrationConfig } from './admin-migration.mjs';
import { CONTROL_SCHEMA } from './admin-controls.mjs';
import { ACCESS_SCHEMA } from './admin-neon.mjs';

// Operator-only additive setup. Never initialize schemas in a public login request.
if (!savedStorageEnabled() || process.env.NF_ADMIN_PREPARE_AUTHORIZED !== 'yes') throw new Error('Verified environment and explicit administrator setup authorization required');
migrationConfig(process.env);
const schema = productionEnabled() ? 'nf_admin_production' : 'nf_admin_preview';
const pool = new pg.Pool({ connectionString: directPilotUrl(process.env), options: `-c search_path=${schema}`, max: 1 });
try {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  const auth = createAdminAuth({ database: pool, secret: process.env.BETTER_AUTH_SECRET, baseURL: process.env.BETTER_AUTH_URL });
  await (await getMigrations(auth.options)).runMigrations();
  await pool.query('CREATE TABLE IF NOT EXISTS admin_account_migrations (source_user_id text PRIMARY KEY, user_id text UNIQUE NOT NULL REFERENCES "user"(id), email text UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now())');
  await pool.query(CONTROL_SCHEMA);
  await pool.query(ACCESS_SCHEMA);
  console.log('Administrator schema prepared; no accounts or passwords copied.');
} finally { await pool.end(); }
