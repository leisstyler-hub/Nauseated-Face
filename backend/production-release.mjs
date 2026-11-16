import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Source } from './source.mjs';
import { importPostgres } from './postgres-store.mjs';
import { prepareSnapshot } from './postgres-pilot.mjs';
import { openSiteStore, productionEnabled } from './production.mjs';

// Deployment-only preparation: keep the old public site compatible while
// additive tables/indexes and the King County materialization are prepared.
// Other markets import only after the new application is serving production.
export async function prepareProductionRelease(store, source = new Source({pageSize:10000})) {
  const before = (await store.pool.query('SELECT source_id,hash,raw_json FROM nf_preview.row_revisions ORDER BY source_id,hash')).rows;
  await store.migrate();
  const snapshot = await source.snapshot({type:'all'});
  const captured = {snapshot:async()=>snapshot};
  const kingImport = await importPostgres(store, captured, {type:'all'});
  const expected = prepareSnapshot(snapshot);
  const saved = (await store.pool.query("SELECT source_id,raw_json FROM nf_preview.source_rows WHERE jurisdiction_id='wa-king' AND active")).rows;
  const native = new Map(expected.rows.map(row=>[row.sourceId,row.raw]));
  assert.equal(saved.length,native.size,'Full source row count parity');
  for(const row of saved) assert.equal(row.raw_json,native.get(row.source_id),'Exact current source row parity');
  const repeat = await importPostgres(store,captured,{type:'all'});
  assert.equal(repeat.changedCount,0,'Repeat full snapshot must be idempotent');
  const geography = (await store.pool.query("SELECT upper(trim(city)) AS city,count(*)::int AS businesses,sum(inspection_count)::int AS inspections,min(latest_inspection_date) AS oldest_latest,max(latest_inspection_date) AS newest FROM nf_preview.establishments WHERE jurisdiction_id='wa-king' GROUP BY upper(trim(city)) ORDER BY city")).rows;
  const [dates] = (await store.pool.query("SELECT min(inspection_date) AS oldest,max(inspection_date) AS newest,count(*)::int AS inspections FROM nf_preview.inspections WHERE jurisdiction_id='wa-king'")).rows;
  const after = (await store.pool.query('SELECT source_id,hash,raw_json FROM nf_preview.row_revisions ORDER BY source_id,hash')).rows;
  const revisions = new Map(after.map(row => [JSON.stringify([row.source_id, row.hash]), row.raw_json]));
  for (const row of before) assert.equal(revisions.get(JSON.stringify([row.source_id, row.hash])), row.raw_json, 'Previous source revision must remain intact');
  const metrics = await store.operations();
  return { preservedRevisions: before.length, kingImport, repeat, nativeRowsVerified:saved.length, geography, dates, counts: metrics.counts, storage: metrics.storage };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!productionEnabled()) throw new Error('Release preparation requires the configured production runtime');
  const store = openSiteStore();
  try { console.log(JSON.stringify({ productionReleasePreparation: await prepareProductionRelease(store) })); }
  finally { await store.close(); }
}
