import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Source } from './source.mjs';
import { openSiteStore, productionEnabled, runProductionRefresh } from './production.mjs';

// Deployment-only preparation: keep the old public site compatible while
// additive tables/indexes and the King County materialization are prepared.
// Other markets import only after the new application is serving production.
export async function prepareProductionRelease(store, source = new Source()) {
  const before = (await store.pool.query('SELECT source_id,hash,raw_json FROM nf_preview.row_revisions ORDER BY source_id,hash')).rows;
  const kingImport = await runProductionRefresh(store, source);
  const after = (await store.pool.query('SELECT source_id,hash,raw_json FROM nf_preview.row_revisions ORDER BY source_id,hash')).rows;
  const revisions = new Map(after.map(row => [JSON.stringify([row.source_id, row.hash]), row.raw_json]));
  for (const row of before) assert.equal(revisions.get(JSON.stringify([row.source_id, row.hash])), row.raw_json, 'Previous source revision must remain intact');
  const metrics = await store.operations();
  return { preservedRevisions: before.length, kingImport, counts: metrics.counts, storage: metrics.storage };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!productionEnabled()) throw new Error('Release preparation requires the configured production runtime');
  const store = openSiteStore();
  try { console.log(JSON.stringify({ productionReleasePreparation: await prepareProductionRelease(store) })); }
  finally { await store.close(); }
}
