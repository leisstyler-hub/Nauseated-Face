import pg from 'pg';
import { timingSafeEqual } from 'node:crypto';
import { PostgresStore, directPilotUrl, importPostgres, openPostgres } from './postgres-store.mjs';
import { Source } from './source.mjs';

export const productionEnabled = (env = process.env) => env.VERCEL_ENV === 'production' && env.NF_STORAGE_MODE === 'postgres';
export const savedStorageEnabled = (env = process.env) => productionEnabled(env) || (env.VERCEL_ENV === 'preview' && env.NF_PILOT_VERIFIED === 'yes');

// Adapt only internal SQL text, never parameter values. The fixed namespace and
// independent session lock keep every production write outside the pilot.
export function productionPool(pool) {
  const sql = text => text.replaceAll('nf_preview.', 'nf_production.').replaceAll('SCHEMA IF NOT EXISTS nf_preview;', 'SCHEMA IF NOT EXISTS nf_production;').replaceAll('78623491', '78623492');
  const wrap = client => ({ query: (text, params) => client.query(sql(text), params), release: error => client.release(error) });
  return { query: (text, params) => pool.query(sql(text), params), connect: async () => wrap(await pool.connect()), end: () => pool.end() };
}

export function openSiteStore(env = process.env) {
  if (!productionEnabled(env)) return openPostgres(env);
  return new PostgresStore(productionPool(new pg.Pool({ connectionString: directPilotUrl(env), max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 })));
}

export function refreshAuthorized(request, env = process.env) {
  if (!productionEnabled(env) || !env.CRON_SECRET || env.CRON_SECRET.length < 32) return false;
  const supplied = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function runProductionRefresh(store, source = new Source()) {
  await store.migrate();
  return importPostgres(store, source, { type: 'latest', limit: 100 });
}
