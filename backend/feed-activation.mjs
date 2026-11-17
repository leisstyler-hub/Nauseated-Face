import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { ADAPTERS } from './adapters/index.mjs';
import { importPostgres } from './postgres-store.mjs';
import { prepareSnapshot } from './postgres-pilot.mjs';
import { openSiteStore, productionEnabled } from './production.mjs';

export const ACTIVATION_IDS = ['md-montgomery','il-chicago','oh-cincinnati','ny-nyc','tx-austin'];

export async function verifyProductionServing(releaseId, ids, fetcher=fetch) {
  const response=await fetcher('https://www.nauseated-face.app/api/release',{cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('Cannot verify serving production application');
  const proof=await response.json();
  if(proof.commitSha!==releaseId)throw new Error('Matching application is not serving production');
  if(!Array.isArray(proof.adapterIds)||ids.some(id=>!proof.adapterIds.includes(id)))throw new Error('Serving production application lacks required adapters');
  return true;
}

// Run after the adapter-capable application is serving. Credentials remain in
// the existing production build runtime; there is no public migration endpoint.
export async function activateValidatedFeeds(store, { releaseId, ids = ACTIVATION_IDS, createSource = id => ADAPTERS[id].createSource(), verifyServing=verifyProductionServing } = {}) {
  if (!releaseId || !Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !ACTIVATION_IDS.includes(id))) throw new Error('Invalid feed activation scope');
  assert.equal(await verifyServing(releaseId,ids),true,'Matching production application must be serving before activation');
  await store.migrate();
  await store.pool.query(`CREATE TABLE IF NOT EXISTS nf_preview.feed_activation_backups(
    release_id text NOT NULL,jurisdiction_id text NOT NULL,captured_at timestamptz NOT NULL DEFAULT now(),
    previous_catalog jsonb NOT NULL,source_rows jsonb NOT NULL,status text NOT NULL DEFAULT 'prepared',summary jsonb,
    PRIMARY KEY(release_id,jurisdiction_id))`);
  const kingState = async () => (await store.pool.query("SELECT count(*)::int AS rows,md5(coalesce(string_agg(source_id||hash||active::text,',' ORDER BY source_id),'')) AS digest FROM nf_preview.source_rows WHERE jurisdiction_id='wa-king'")).rows[0];
  const kingBefore = await kingState();
  const sources = [], failures = [];
  const scope = { type:'latest',limit:25 };
  for (const id of ids) {
    const previous = (await store.pool.query('SELECT * FROM nf_preview.jurisdictions WHERE id=$1',[id])).rows[0];
    await store.pool.query(`INSERT INTO nf_preview.feed_activation_backups(release_id,jurisdiction_id,previous_catalog,source_rows)
      SELECT $1,$2,to_jsonb(j),coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY source_id) FROM nf_preview.source_rows s WHERE jurisdiction_id=$2),'[]'::jsonb)
      FROM nf_preview.jurisdictions j WHERE j.id=$2 ON CONFLICT DO NOTHING`,[releaseId,id]);
    try {
      const prior = (await store.pool.query('SELECT source_id,hash,raw_json FROM nf_preview.row_revisions WHERE source_id LIKE $1',[`${id}:%`])).rows;
      const snapshot = await createSource(id).snapshot(scope);
      if (!snapshot.rows.length) throw new Error('Empty source cannot be activated');
      const expected = prepareSnapshot(snapshot,id);
      assert.equal(expected.events.size,scope.limit,'Activation requires the validated complete-event count');
      const captured = { snapshot:async()=>snapshot };
      const first = await importPostgres(store,captured,scope,id);
      const saved = new Map((await store.pool.query('SELECT source_id,raw_json FROM nf_preview.source_rows WHERE active AND jurisdiction_id=$1',[id])).rows.map(r=>[r.source_id,r.raw_json]));
      for (const row of expected.rows) assert.equal(saved.get(row.sourceId),row.raw,'Exact raw source parity');
      const repeat = await importPostgres(store,captured,scope,id);
      assert.equal(repeat.changedCount,0,'Repeated snapshot must be idempotent');
      const revisions = new Map((await store.pool.query('SELECT source_id,hash,raw_json FROM nf_preview.row_revisions WHERE source_id LIKE $1',[`${id}:%`])).rows.map(r=>[JSON.stringify([r.source_id,r.hash]),r.raw_json]));
      for(const row of prior) assert.equal(revisions.get(JSON.stringify([row.source_id,row.hash])),row.raw_json,'Prior source revisions retained');
      const freshSnapshot=await createSource(id).snapshot(scope);
      assert.equal(prepareSnapshot(freshSnapshot,id).events.size,scope.limit,'Fresh source must contain the validated complete-event count');
      const freshRefresh = await importPostgres(store,{snapshot:async()=>freshSnapshot},scope,id);
      await store.pool.query("UPDATE nf_preview.jurisdictions SET enabled=true,coverage_status='limited' WHERE id=$1",[id]);
      const e=ADAPTERS[id].establishment(snapshot.rows[0]);
      const found=await store.searchEstablishments({q:e.name,stateCode:ADAPTERS[id].stateCode,jurisdictionId:id});
      assert.ok(found.length,'Imported source must be searchable');
      const profile=await store.establishmentBySlug(ADAPTERS[id].stateCode,found[0].slug);
      assert.ok(profile.inspections.length,'Imported source must have a public profile');
      const summary={jurisdictionId:id,scope,rows:first.rowCount,events:expected.events.size,revision:first.revision,rawParity:true,repeatChanged:repeat.changedCount,preservedRevisions:prior.length,freshRefresh,profileSlug:profile.slug,stateCode:ADAPTERS[id].stateCode};
      await store.pool.query("UPDATE nf_preview.feed_activation_backups SET status='success',summary=$3 WHERE release_id=$1 AND jurisdiction_id=$2",[releaseId,id,JSON.stringify(summary)]);
      sources.push(summary);
    } catch {
      await store.pool.query('UPDATE nf_preview.jurisdictions SET enabled=$2,coverage_status=$3 WHERE id=$1',[id,previous.enabled,previous.coverage_status]);
      const summary={jurisdictionId:id,error:'Activation validation failed; prior publication settings restored and history retained'};
      await store.pool.query("UPDATE nf_preview.feed_activation_backups SET status='error',summary=$3 WHERE release_id=$1 AND jurisdiction_id=$2",[releaseId,id,JSON.stringify(summary)]);
      failures.push(summary);
    }
  }
  assert.deepEqual(await kingState(),kingBefore,'King County source records must be unchanged');
  return {releaseId,sources,failures,kingCountyUnchanged:true,coverage:'Limited recent complete inspections; full backfill remains pending. Fresh manual refresh observed, not scheduled Cron delivery.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const serving=process.argv.find(arg=>arg.startsWith('--serving='))?.slice('--serving='.length);
  if(!productionEnabled()||process.env.VERCEL_PROJECT_ID!=='prj_AVlLZB3ZyzWpoi3jPmzhJ9VtPRbC'||!serving||serving!==process.env.VERCEL_GIT_COMMIT_SHA)throw new Error('Feed activation requires the matching verified production application');
  const store=openSiteStore();
  try{const result=await activateValidatedFeeds(store,{releaseId:serving});console.log(JSON.stringify({feedActivation:result}));if(result.failures.length)process.exitCode=1;}
  finally{await store.close();}
}
