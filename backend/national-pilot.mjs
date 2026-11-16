import assert from 'node:assert/strict';
import { ADAPTERS } from './adapters/index.mjs';
import { importPostgres } from './postgres-store.mjs';

// Invoked only by the existing authenticated Preview probe, never public reads.
export async function runNationalPilot(store) {
  await store.migrate();
  const results = [];
  for (const id of ['wa-king', 'il-chicago', 'md-montgomery']) {
    const scope = { type: 'latest', limit: id === 'wa-king' ? 5 : 25 };
    const snapshot = await ADAPTERS[id].createSource().snapshot(scope);
    assert.ok(snapshot.rows.length, 'No records returned; keep location inactive');
    const source = { snapshot: async () => snapshot };
    const first = await importPostgres(store, source, scope, id);
    const repeat = await importPostgres(store, source, scope, id);
    assert.equal(repeat.changedCount, 0);
    const saved = (await store.pool.query('SELECT raw_json FROM nf_preview.source_rows WHERE active AND jurisdiction_id=$1', [id])).rows.map(r => JSON.parse(r.raw_json));
    for (const row of snapshot.rows) assert.deepEqual(saved.find(r => r[':id'] === row[':id']), row);
    const before = JSON.stringify((await store.pool.query('SELECT * FROM nf_preview.source_rows ORDER BY source_id')).rows);
    await assert.rejects(importPostgres(store, { snapshot() { throw new Error('Controlled source failure'); } }, scope, id));
    assert.equal(JSON.stringify((await store.pool.query('SELECT * FROM nf_preview.source_rows ORDER BY source_id')).rows), before);
    await importPostgres(store, source, scope, id); // End the controlled failure probe on a verified successful refresh.
    await store.pool.query("UPDATE nf_preview.jurisdictions SET enabled=true, coverage_status='limited' WHERE id=$1", [id]);
    const e = ADAPTERS[id].establishment(snapshot.rows[0]);
    const found = await store.searchEstablishments({ q: e.name, city: e.city, stateCode: ADAPTERS[id].stateCode });
    assert.ok(found.length, 'Imported record must be searchable');
    const profile = await store.establishmentBySlug(ADAPTERS[id].stateCode, found[0].slug);
    assert.ok(profile.inspections.length);
    results.push({ jurisdictionId: id, first, repeat, comparedRows: snapshot.rows.length, sourceFailureRetainedRecords: true, searchVerified: true, profileSlug: profile.slug, sourceUrls: snapshot.urls });
  }
  return { results, coverage: 'Bounded recent samples; no complete jurisdiction or establishment history implied.' };
}
