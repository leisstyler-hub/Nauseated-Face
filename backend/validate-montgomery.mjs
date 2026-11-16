import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { PostgresStore, importPostgres } from './postgres-store.mjs';
import { adapter } from './adapters/md-montgomery.mjs';

// Real official records in a disposable local database. Never opens Neon.
const db = new PGlite();
const client = { query: (sql, params) => params ? db.query(sql, params) : db.exec(sql).then(r => r.at(-1)), release() {} };
const store = new PostgresStore({ ...client, connect: async () => client });
try {
  await store.migrate();
  const scope = { type: 'latest', limit: 25 };
  const snapshot = await adapter.createSource().snapshot(scope);
  assert.ok(snapshot.rows.length > 0);
  const source = { snapshot: async () => snapshot };
  const first = await importPostgres(store, source, scope, adapter.jurisdictionId);
  const repeat = await importPostgres(store, source, scope, adapter.jurisdictionId);
  assert.equal(repeat.changedCount, 0);
  const stored = (await db.query('SELECT raw_json FROM nf_preview.source_rows WHERE jurisdiction_id=$1', [adapter.jurisdictionId])).rows;
  assert.equal(stored.length, snapshot.rows.length);
  for (const row of snapshot.rows) assert.deepEqual(stored.map(r => JSON.parse(r.raw_json)[':original']).find(r => r.inspection_number === row[':id']), row[':original']);
  await db.query("UPDATE nf_preview.jurisdictions SET enabled=true,coverage_status='limited' WHERE id=$1", [adapter.jurisdictionId]);
  const example = snapshot.rows[0];
  const matches = await store.searchEstablishments({ q: example.name, stateCode: 'MD', city: example.city });
  assert.ok(matches.length);
  const profile = await store.establishmentBySlug('MD', matches[0].slug);
  assert.ok(profile.inspections.some(i => i.serial === example.inspection_serial_num));
  const beforeFailure = (await db.query('SELECT raw_json FROM nf_preview.source_rows WHERE jurisdiction_id=$1 ORDER BY source_id', [adapter.jurisdictionId])).rows;
  await assert.rejects(importPostgres(store, { snapshot: async () => { throw new Error('Simulated source failure'); } }, scope, adapter.jurisdictionId));
  assert.deepEqual((await db.query('SELECT raw_json FROM nf_preview.source_rows WHERE jurisdiction_id=$1 ORDER BY source_id', [adapter.jurisdictionId])).rows, beforeFailure);
  assert.equal((await store.establishmentBySlug('MD', matches[0].slug)).inspections.length, profile.inspections.length);
  assert.equal((await db.query('SELECT count(*) AS n FROM nf_preview.source_rows WHERE jurisdiction_id=$1', [adapter.jurisdictionId])).rows[0].n, stored.length);
  const evidence = { verifiedAt: new Date().toISOString(), environment: 'Disposable local PGlite; no Neon or production changes', source: adapter.config, revision: snapshot.revision, urls: snapshot.urls, sampleRows: first.rowCount, exactOriginalParity: true, repeatChanges: repeat.changedCount, cityAndNameSearch: true, profileHistory: true, failureRetention: true, publicActivation: false, limitations: ['25 recent inspections, not complete county coverage', 'Checklist exceptions and corrected-onsite values retained verbatim; no numeric scores or inferred severity', 'Source starts July 2024; other food facilities are included alongside restaurants', 'Hosted import and publication remain pending'] };
  writeFileSync(new URL('../docs/MONTGOMERY_SOURCE_VALIDATION.json', import.meta.url), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} finally { await db.close(); }
