import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { PostgresStore, importPostgres, searchQuery } from './postgres-store.mjs';
import { JURISDICTIONS, citySlug } from './jurisdictions.mjs';

const row = (id, business, serial, extra = {}) => ({
  ':id': id, business_id: business, inspection_serial_num: serial, inspection_date: '2026-01-01',
  name: 'Synthetic Diner', address: '1 Synthetic Way', city: 'Seattle', zip_code: '98101',
  inspection_result: 'Satisfactory', inspection_score: '05.00', violation_points: '05', violation_description: 'Synthetic finding',
  ...extra,
});
const source = (rows, scope = { type: 'all' }) => ({ snapshot: async () => ({ rows, scope, revision: 'synthetic-1', urls: [] }) });

const open = async () => {
  const db = new PGlite();
  const client = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(results => results.at(-1)), release() {} };
  const store = new PostgresStore({ ...client, connect: async () => client });
  await store.migrate();
  return { db, store };
};

test('migration seeds the jurisdiction catalog and only verified markets are enabled', async () => {
  const { db, store } = await open();
  try {
    const catalog = await store.catalog();
    assert.equal(catalog.length, JURISDICTIONS.length);
    assert.deepEqual(catalog.filter(j => j.enabled).map(j => j.id), ['wa-king']);
    const tn = catalog.find(j => j.id === 'tn-state');
    assert.equal(tn.coverageStatus, 'unavailable');
    assert.equal(tn.scoring.type, 'score_100');
    await store.migrate(); // idempotent
    assert.equal((await store.catalog()).length, JURISDICTIONS.length);
  } finally { await db.close(); }
});

test('imports build establishments with latest inspection, counts, slugs and search', async () => {
  const { db, store } = await open();
  try {
    await importPostgres(store, source([
      row('1', 'B-1', 'I-1', { name: 'Taco Villa', city: 'Seattle' }),
      row('2', 'B-1', 'I-1', { name: 'Taco Villa', city: 'Seattle' }),
      row('3', 'B-1', 'I-2', { name: 'Taco Villa Rebranded', city: 'Seattle', inspection_date: '2026-02-01', inspection_result: 'Unsatisfactory', inspection_score: '40.00' }),
      row('4', 'B-2', 'I-3', { name: 'Noodle Barn', city: 'Bellevue', zip_code: '98004' }),
    ]), { type: 'all' });

    const [villa] = await store.searchEstablishments({ q: 'taco vil' });
    assert.equal(villa.name, 'Taco Villa Rebranded'); // newest inspection names the profile
    assert.equal(villa.inspectionCount, 2);
    assert.equal(villa.latestResult, 'Unsatisfactory');
    assert.equal(villa.latestInspectionDate, '2026-02-01');
    assert.equal(villa.stateCode, 'WA');
    assert.ok(villa.slug.startsWith(citySlug('Taco Villa Rebranded')));

    assert.equal((await store.searchEstablishments({ q: '98004' }))[0].name, 'Noodle Barn');
    assert.equal((await store.searchEstablishments({ q: 'noodle', city: 'Seattle' })).length, 0);
    assert.equal((await store.searchEstablishments({ q: 'noodle', stateCode: 'wa' })).length, 1);
    assert.equal((await store.searchEstablishments({ q: '' })).length, 0);
    assert.equal(searchQuery('  ! '), null);
    assert.equal(searchQuery("taco'; drop--"), 'taco:* & drop:*');

    const seattle = await store.cityEstablishments('WA', 'seattle');
    assert.deepEqual(seattle.map(e => e.name), ['Taco Villa Rebranded']);
    const covered = await store.coveredCities();
    assert.deepEqual(covered.map(c => c.city), ['Bellevue', 'Seattle']);

    const profile = await store.establishmentBySlug('WA', villa.slug);
    assert.equal(profile.jurisdiction.id, 'wa-king');
    assert.equal(profile.jurisdiction.scoring.type, 'violation_points');
    assert.equal(profile.inspections.length, 2);
    assert.equal(profile.inspections[0].inspectionDate, '2026-02-01');
    assert.ok(profile.inspections[0].sourceUrl.includes('business_id=B-1'));
    assert.equal(await store.establishmentBySlug('WA', 'missing-slug'), null);

    // Re-import with one business removed: establishments rebuild consistently.
    await importPostgres(store, source([row('4', 'B-2', 'I-3', { name: 'Noodle Barn', city: 'Bellevue', zip_code: '98004' })]), { type: 'all' });
    assert.equal((await store.searchEstablishments({ q: 'taco' })).length, 0);
    assert.equal((await store.cityEstablishments('WA', 'bellevue')).length, 1);
  } finally { await db.close(); }
});

test('an import without a registered adapter is rejected before touching the source', async () => {
  const { db, store } = await open();
  try {
    await assert.rejects(importPostgres(store, source([row('1', 'B-1', 'I-1')]), { type: 'all' }, 'tn-state'), /without an adapter/);
  } finally { await db.close(); }
});
