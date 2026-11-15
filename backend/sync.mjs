import { ADAPTERS } from './adapters/index.mjs';
import { importPostgres } from './postgres-store.mjs';

export async function syncEnabledSources(store, createSource = id => ADAPTERS[id].createSource()) {
  await store.migrate();
  const sources = [], failures = [];
  for (const jurisdiction of (await store.catalog()).filter(j => j.enabled)) {
    try {
      if (!ADAPTERS[jurisdiction.id]) throw new Error('Enabled source has no adapter');
      const scope = jurisdiction.id === 'wa-king' ? { type: 'all' } : { type: 'latest', limit: 25 };
      sources.push({ jurisdictionId: jurisdiction.id, ...await importPostgres(store, createSource(jurisdiction.id), scope, jurisdiction.id) });
    } catch { failures.push({ jurisdictionId: jurisdiction.id, error: 'Import failed; previous committed records retained' }); }
  }
  return { sources, failures, coverage: 'King County: complete published dataset snapshot. Other sources: bounded recent samples. Source history does not establish current safety.' };
}
