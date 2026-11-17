import { ADAPTERS } from './adapters/index.mjs';
import { importPostgres } from './postgres-store.mjs';
import {BackfillSource} from './backfill-source.mjs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export async function syncEnabledSources(store, createSource = id => id==='wa-king'?ADAPTERS[id].createSource():new BackfillSource(ADAPTERS[id],{directory:join(tmpdir(),'nf-refresh'),pageSize:10000}), options={}) {
  await store.migrate();
  const sources = [], failures = [];
  const today=options.now??new Date(),start=new Date(today),end=new Date(today);start.setUTCDate(start.getUTCDate()-45);end.setUTCDate(end.getUTCDate()+1);
  for (const jurisdiction of (await store.catalog()).filter(j => j.enabled&&(!options.jurisdictionId||j.id===options.jurisdictionId))) {
    try {
      if (!ADAPTERS[jurisdiction.id]) throw new Error('Enabled source has no adapter');
      const scope = jurisdiction.id === 'wa-king' ? { type: 'all' } : { type:'window',start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10) };
      const result=await importPostgres(store,createSource(jurisdiction.id),scope,jurisdiction.id);
      await store.pool.query('UPDATE nf_preview.refresh_runs SET trigger_kind=$1,request_meta=$2 WHERE id=$3',[options.trigger==='vercel-cron'?'vercel-cron':'operator',JSON.stringify({schedule:options.schedule??null}),result.runId]);
      sources.push({ jurisdictionId: jurisdiction.id, ...result });
    } catch { failures.push({ jurisdictionId: jurisdiction.id, error: 'Import failed; previous committed records retained' }); }
  }
  return { sources, failures, coverage: 'King County: complete published dataset snapshot. Other enabled sources: complete inspections in a 45-day rolling window plus retained historical backfills. Publisher gaps and quarantined rows remain explicit. Source history does not establish current safety.' };
}
