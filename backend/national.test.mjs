import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { PostgresStore, importPostgres, searchQuery } from './postgres-store.mjs';
import { JURISDICTIONS, citySlug } from './jurisdictions.mjs';
import { syncEnabledSources } from './sync.mjs';

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

test('city proximity summaries retain only valid imported coordinates', async () => {
  const { db, store } = await open();
  try {
    await importPostgres(store, source([
      row('geo1', 'geo1', 'geo1', { latitude: '47.6', longitude: '-122.3' }),
      row('geo2', 'geo2', 'geo2', { latitude: '47.8', longitude: '-122.5' }),
      row('geo3', 'geo3', 'geo3', { latitude: '', longitude: '' }),
    ]), { type: 'all' });
    const [city] = await store.coveredCities();
    assert.equal(city.establishmentCount, 3);
    assert.ok(Math.abs(city.latitude - 47.7) < 0.00001);
    assert.ok(Math.abs(city.longitude + 122.4) < 0.00001);
  } finally { await db.close(); }
});

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

test('national imports isolate overlapping official identifiers and retain King County history', async () => {
  const { db, store } = await open();
  try {
    await importPostgres(store, source([row('1', 'B-1', 'I-1')]), { type: 'all' });
    await importPostgres(store, source([row('1', 'B-1', 'I-1', { name: 'Chicago Kitchen', city: 'Chicago' })]), { type: 'all' }, 'il-chicago');
    assert.equal((await store.searchEstablishments({ q: 'Chicago' })).length, 0, 'Staged sources must not publish before activation');
    await db.query("UPDATE nf_preview.jurisdictions SET enabled=true,coverage_status='limited' WHERE id='il-chicago'");
    assert.equal((await store.searchEstablishments({ q: 'Diner' })).length, 1);
    assert.equal((await store.searchEstablishments({ q: 'Chicago' }))[0].stateCode, 'IL');
    assert.equal((await db.query('SELECT * FROM nf_preview.inspections')).rows.length, 2);
    assert.equal((await store.latest(20, 0, undefined, 'wa-king')).length, 1);
    assert.ok((await store.establishmentBySlug('IL', (await store.searchEstablishments({ q: 'Chicago' }))[0].slug)).inspections[0].sourceUrl.includes('data.cityofchicago.org'));
    const prior = (await store.searchEstablishments({ q: 'Diner' }))[0];
    await importPostgres(store, source([row('1', 'B-1', 'I-1', { name: 'Renamed Kitchen' })]), { type: 'all' });
    assert.equal((await store.establishmentBySlug('WA', prior.slug)).name, 'Renamed Kitchen');
    await assert.rejects(importPostgres(store, { snapshot() { throw new Error('offline'); } }, { type: 'all' }, 'il-chicago'));
    assert.equal((await store.searchEstablishments({ q: 'Chicago' })).length, 1);
    assert.equal((await store.status()).error, null, 'Chicago failure must not mark King County feed as failed');
    const chicago = (await store.latest(10, 0, undefined, 'il-chicago'))[0];
    await importPostgres(store, source([]), { type: 'all' }, 'il-chicago');
    assert.ok((await store.detail(chicago.id)).sourceUrl.includes('data.cityofchicago.org'), 'Archived national rows must retain source authority');
  } finally { await db.close(); }
});

test('operations reports actual source counts, failures, and storage without inventing revenue', async () => {
  const { db, store } = await open();
  try {
    await importPostgres(store, source([row('1', 'B', 'I')]), { type: 'all' });
    await assert.rejects(importPostgres(store, { snapshot() { throw Error('offline'); } }, { type: 'all' }));
    const data = await store.operations();
    assert.equal(data.counts.establishments, 1);
    assert.equal(data.counts.inspections, 1);
    assert.equal(data.sources.find(s => s.id === 'wa-king').lastAttempt.status, 'error');
    assert.ok(data.sources.find(s => s.id === 'wa-king').lastSuccess);
    assert.equal(data.integrations.advertising, 'not_connected');
    assert.ok(Number(data.storage.schemaBytes) >= 0);
    for (let i=0; i<21; i++) await db.query("INSERT INTO nf_preview.refresh_runs(started_at,status,scope,jurisdiction_id) VALUES('test','error','{}','il-chicago')");
    assert.equal((await store.operations()).sources.find(s => s.id === 'wa-king').lastAttempt.status, 'error');
  } finally { await db.close(); }
});

test('indexed search accepts state and unicode terms and bounded pagination', async () => {
  const { db, store } = await open();
  try {
    await importPostgres(store, source([row('1', 'A', '1', { name: 'Café Test' }), row('2', 'B', '2', { name: 'Café Other' })]), { type: 'all' });
    assert.equal((await store.searchEstablishments({ q: 'Washington' })).length, 2);
    assert.equal((await store.searchEstablishments({ q: 'Café', limit: 1, offset: 1 })).length, 1);
    await assert.rejects(store.searchEstablishments({ q: 'Test', limit: 1.5 }), /pagination/);
  } finally { await db.close(); }
});

test('scheduled collector isolates failures, retains prior data and respects source enablement', async () => {
  const { db, store } = await open();
  try {
    await importPostgres(store, source([row('1', 'B', 'I')]), { type: 'all' });
    await db.query("UPDATE nf_preview.jurisdictions SET enabled=true WHERE id='il-chicago'");
    const called = [];
    const result = await syncEnabledSources(store, id => {
      called.push(id);
      if (id === 'wa-king') return { snapshot() { throw Error('offline'); } };
      return { snapshot: async scope => ({ rows: [row('1', 'B', 'I', { name: 'Chicago Test', city: 'Chicago' })], scope, revision: 'test', urls: [] }) };
    });
    assert.deepEqual(new Set(called), new Set(['wa-king', 'il-chicago']));
    assert.deepEqual(result.failures.map(f => f.jurisdictionId), ['wa-king']);
    assert.equal(result.sources[0].jurisdictionId, 'il-chicago');
    assert.equal((await store.latest(10, 0, undefined, 'wa-king')).length, 1);
    assert.match((await store.status()).error, /Import failed/, 'Chicago success cannot hide King County failure');
  } finally { await db.close(); }
});
