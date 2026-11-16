import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { PostgresStore, importPostgres } from './postgres-store.mjs';
import { prepareProductionRelease } from './production-release.mjs';

test('release preparation preserves previous raw revisions and only refreshes King County before promotion', async () => {
  const db = new PGlite();
  const client = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(r => r.at(-1)), release() {} };
  const store = new PostgresStore({ ...client, connect: async () => client });
  const old = { ':id': 'release-row', business_id: 'release-business', inspection_serial_num: 'release-event', inspection_date: '2026-11-14', name: 'Original Name' };
  const source = rows => ({ snapshot: async scope => ({ rows, scope, revision: 'synthetic', urls: [] }) });
  try {
    await store.migrate();
    await importPostgres(store, source([old]), { type: 'latest', limit: 100 });
    const result = await prepareProductionRelease(store, source([{ ...old, name: 'Corrected Name' }]));
    assert.equal(result.preservedRevisions, 1);
    assert.equal(result.kingImport.rowCount, 1);
    assert.equal((await db.query("SELECT count(*) AS n FROM nf_preview.inspections WHERE jurisdiction_id <> 'wa-king'")).rows[0].n, 0);
    assert.equal((await db.query('SELECT count(*) AS n FROM nf_preview.row_revisions')).rows[0].n, 2);
    assert.equal((await store.searchEstablishments({ q: 'Corrected' })).length, 1);
    await assert.rejects(prepareProductionRelease(store, { snapshot: async () => { throw Error('Unavailable'); } }));
    assert.equal((await store.searchEstablishments({ q: 'Corrected' })).length, 1);
  } finally { await db.close(); }
});
