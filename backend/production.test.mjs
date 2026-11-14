import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { PostgresStore, importPostgres } from './postgres-store.mjs';
import { productionPool, productionEnabled, refreshAuthorized, runProductionRefresh } from './production.mjs';

test('production opt-in and refresh authorization fail closed', () => {
  const env = { VERCEL_ENV: 'production', NF_STORAGE_MODE: 'postgres', CRON_SECRET: 'a'.repeat(48) };
  assert.equal(productionEnabled(env), true);
  assert.equal(productionEnabled({ ...env, VERCEL_ENV: 'preview' }), false);
  assert.equal(productionEnabled({ ...env, NF_STORAGE_MODE: '' }), false);
  const req = token => new Request('https://example.test/api/refresh', { headers: token ? { authorization: `Bearer ${token}` } : {} });
  assert.equal(refreshAuthorized(req(), env), false);
  assert.equal(refreshAuthorized(req('wrong'), env), false);
  assert.equal(refreshAuthorized(req(env.CRON_SECRET), env), true);
  assert.equal(refreshAuthorized(req(env.CRON_SECRET), { ...env, VERCEL_ENV: 'preview' }), false);
  assert.equal(refreshAuthorized(req('short'), { ...env, CRON_SECRET: 'short' }), false);
});

test('production schema preserves Preview and source values through repeat and failure', async () => {
  const db = new PGlite();
  const client = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(r => r.at(-1)), release() {} };
  const pool = { ...client, connect: async () => client, end: async () => {} };
  const preview = new PostgresStore(pool);
  const production = new PostgresStore(productionPool(pool));
  const row = { ':id': 'synthetic-1', business_id: 'SYNTHETIC-B', inspection_serial_num: 'SYNTHETIC-I', inspection_date: '2026-11-14', inspection_score: '05.00', violation_points: '05', name: 'nf_preview.78623491 preserved' };
  const scope = { type: 'latest', limit: 100 };
  const source = { snapshot: async s => ({ rows: [row], scope: s, revision: 'synthetic', urls: [] }) };
  try {
    await preview.migrate();
    await importPostgres(preview, { snapshot: async () => ({ rows: [{ ...row, ':id': 'preview-only' }], scope, revision: 'preview', urls: [] }) }, scope);
    assert.equal((await runProductionRefresh(production, source)).rowCount, 1);
    assert.equal((await runProductionRefresh(production, source)).changedCount, 0);
    const [item] = await production.latest(10, 0);
    assert.deepEqual((await production.detail(item.id)).rows, [row]);
    assert.equal((await preview.detail(item.id)).rows[0][':id'], 'preview-only');
    assert.equal((await production.history(row.business_id, 10, 0)).complete, false);
    await assert.rejects(runProductionRefresh(production, { snapshot: async () => { throw Error('source unavailable'); } }), /source unavailable/);
    assert.deepEqual((await production.detail(item.id)).rows, [row]);
    assert.ok((await production.status()).lastSuccess);
    assert.equal((await preview.recentRuns()).length, 1);
  } finally { await db.close(); }
});
