import { ADAPTERS } from './adapters/index.mjs';
import { importPostgres } from './postgres-store.mjs';

export async function syncEnabledSources(store, createSource = id => ADAPTERS[id].createSource()) {
  await store.migrate();
  const sources = [], failures = [];
  for (const jurisdiction of (await store.catalog()).filter(j => j.enabled)) {
    try {
      if (!ADAPTERS[jurisdiction.id]) throw new Error('Enabled source has no adapter');
      const scope = { type: 'latest', limit: jurisdiction.id === 'wa-king' ? 100 : 25 };
      sources.push({ jurisdictionId: jurisdiction.id, ...await importPostgres(store, createSource(jurisdiction.id), scope, jurisdiction.id) });
    } catch { failures.push({ jurisdictionId: jurisdiction.id, error: 'Import failed; previous committed records retained' }); }
  }
  return { sources, failures, coverage: 'Bounded recent samples. Incremental cursors and historical backfills remain pending.' };
}
