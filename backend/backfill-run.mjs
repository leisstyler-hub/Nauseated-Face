import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {ADAPTERS} from './adapters/index.mjs';
import {BackfillSource} from './backfill-source.mjs';
import {prepareSnapshot} from './postgres-pilot.mjs';
import {importPostgres} from './postgres-store.mjs';
import {openSiteStore,productionEnabled,runProductionRefresh} from './production.mjs';
import {verifyProductionServing} from './feed-activation.mjs';
import {runWindowBackfill} from './window-backfill.mjs';
import {captureBackfillBackup} from './backfill-backup.mjs';

export async function runPartitionedBackfill(store,{releaseId,id,directory='.data/backfill'}={}){
 assert.equal(await verifyProductionServing(releaseId,[id]),true,'Matching adapter code must be serving');
 if(id==='wa-king'||!ADAPTERS[id])throw Error('Invalid partitioned authority');
 await store.migrate();
 const source=new BackfillSource(ADAPTERS[id],{directory,pageSize:10000,onPage:p=>console.log(JSON.stringify({backfillProgress:p}))});
 const {origin,dataset,dateField}=ADAPTERS[id].config;
 const metadata=`${origin}/api/views/${dataset}.json`,before=await source.json(metadata);
 const inventoryUrl=`${origin}/resource/${dataset}.json?${new URLSearchParams({'$select':`count(*) AS count,min(${dateField}) AS first,max(${dateField}) AS last`})}`;
 const inventory=(await source.json(inventoryUrl))[0];
 if(!Number.isSafeInteger(before.rowsUpdatedAt)||!inventory?.first||!inventory?.last)throw Error('Missing complete-source inventory');
 await captureBackfillBackup(store,releaseId,id);
 const result=await runWindowBackfill(store,{jurisdictionId:id,revision:String(before.rowsUpdatedAt),rowCount:Number(inventory.count),firstDate:inventory.first.slice(0,10),lastDate:inventory.last.slice(0,10),source,policyId:releaseId,
  verifyRevision:async()=>{const after=await source.json(metadata);return after.rowsUpdatedAt===before.rowsUpdatedAt;},onWindow:p=>console.log(JSON.stringify({backfillWindow:p}))});
 const [profile]=(await store.pool.query('SELECT state_code,slug FROM nf_preview.establishments WHERE jurisdiction_id=$1 ORDER BY latest_inspection_date DESC NULLS LAST LIMIT 1',[id])).rows;
 if(!profile)throw Error('Full backfill produced no public establishment');
 await store.pool.query("UPDATE nf_preview.jurisdictions SET enabled=true,coverage_status='limited' WHERE id=$1",[id]);
 return {...result,firstInspectionDate:inventory.first,lastInspectionDate:inventory.last,profile};
}

export async function runBackfills(store,{releaseId,ids,verifyServing=verifyProductionServing,createSource=id=>new BackfillSource(ADAPTERS[id],{directory:'.data/backfill',pageSize:10000,onPage:p=>console.log(JSON.stringify({backfillProgress:p}))})}={}) {
 if(!releaseId||!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>id==='wa-king'||!ADAPTERS[id]))throw Error('Invalid backfill authority scope');
 assert.equal(await verifyServing(releaseId,ids),true,'Matching adapter code must be serving');
 await store.migrate();
 const kingState=async()=>(await store.pool.query("SELECT count(*)::int AS rows,md5(coalesce(string_agg(source_id||hash||active::text,',' ORDER BY source_id),'')) AS digest FROM nf_preview.source_rows WHERE jurisdiction_id='wa-king'")).rows[0];
 const kingBefore=await kingState(),sources=[],failures=[];
 const scope={type:'all'};
 for(const id of ids){
  const previous=(await store.pool.query('SELECT enabled,coverage_status FROM nf_preview.jurisdictions WHERE id=$1',[id])).rows[0];
  let stage='collect';
  try{
   const snapshot=await createSource(id).snapshot(scope);
   stage='prepare';
   if(!snapshot.rows.length)throw Error('No safely identifiable inspections in source');
   const expected=prepareSnapshot(snapshot,id);
   stage='backup';await captureBackfillBackup(store,releaseId,id);
   const captured={snapshot:async()=>snapshot};
   stage='import';const first=await importPostgres(store,captured,scope,id);
   stage='repeat';const repeat=await importPostgres(store,captured,scope,id);
   assert.equal(repeat.changedCount,0,'Captured full snapshot must import idempotently');
   stage='parity';const saved=(await store.pool.query('SELECT count(*)::int AS n FROM nf_preview.source_rows WHERE active AND jurisdiction_id=$1 AND last_run=$2',[id,repeat.runId])).rows[0];
   assert.equal(saved.n,expected.rows.length,'All accepted source rows must be committed');
   const sample=expected.rows.filter((_,n)=>n%Math.max(1,Math.floor(expected.rows.length/20))===0).slice(0,20);
   const parity=new Map((await store.pool.query('SELECT source_id,hash,raw_json FROM nf_preview.source_rows WHERE source_id=ANY($1::text[])',[sample.map(r=>r.sourceId)])).rows.map(r=>[r.source_id,r]));
   for(const row of sample){assert.equal(parity.get(row.sourceId)?.raw_json,row.raw);assert.equal(parity.get(row.sourceId)?.hash,row.hash);}
   stage='publish';await store.pool.query("UPDATE nf_preview.jurisdictions SET enabled=true,coverage_status='limited' WHERE id=$1",[id]);
   const establishment=ADAPTERS[id].establishment(snapshot.rows[0]);
   stage='search';const matches=await store.searchEstablishments({q:establishment.name,stateCode:ADAPTERS[id].stateCode,jurisdictionId:id});
   assert.ok(matches.length,'Source must be publicly searchable');
   stage='profile';const profile=await store.establishmentBySlug(ADAPTERS[id].stateCode,matches[0].slug);assert.ok(profile?.inspections.length);
   const dates=[...expected.events.values()].map(e=>e.date).sort();
   const result={jurisdictionId:id,sourceRowCount:first.sourceRowCount,accepted:first.rowCount,rejectedCount:first.rejectedCount,events:expected.events.size,firstInspectionDate:dates[0],lastInspectionDate:dates.at(-1),revision:first.revision,repeatChanged:repeat.changedCount,runId:repeat.runId,sampledRawParity:sample.length,profilePath:`/restaurants/${({CA:'california',DE:'delaware',IL:'illinois',MD:'maryland',NY:'new-york',OH:'ohio',TX:'texas'})[ADAPTERS[id].stateCode]}/${matches[0].slug}`};
   sources.push(result);console.log(JSON.stringify({backfillSource:result}));
  }catch(error){
   if(previous)await store.pool.query('UPDATE nf_preview.jurisdictions SET enabled=$2,coverage_status=$3 WHERE id=$1',[id,previous.enabled,previous.coverage_status]);
   const failure={jurisdictionId:id,error:'Backfill validation failed; prior publication settings and original history retained',category:error.name,stage,code:error.code??null,message:String(error.message).replace(/(?:postgres(?:ql)?|https?):\/\/\S+/g,'[url]').slice(0,200)};failures.push(failure);console.log(JSON.stringify({backfillFailure:failure}));
  }
 }
 assert.deepEqual(await kingState(),kingBefore,'King County must remain unchanged');
 return {releaseId,sources,failures,kingCountyUnchanged:true};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(!productionEnabled()||process.env.VERCEL_PROJECT_ID!=='prj_AVlLZB3ZyzWpoi3jPmzhJ9VtPRbC')throw Error('Backfill requires authorized production project runtime');
 const store=openSiteStore();
 try{
  if(process.argv.includes('--migrate-only')){await store.migrate();console.log('Inspection backfill schema ready');}
  else{
   const releaseId=process.argv.find(a=>a.startsWith('--serving='))?.slice(10),ids=process.argv.find(a=>a.startsWith('--sources='))?.slice(10).split(',');
   if(releaseId!==process.env.VERCEL_GIT_COMMIT_SHA)throw Error('Backfill requires exact serving revision');
   if(!ids?.length||ids.some(id=>!ADAPTERS[id]))throw Error('Valid source authorities are required');
   if(process.argv.includes('--refresh-only')){
    for(const jurisdictionId of ids){const result=await runProductionRefresh(store,undefined,{jurisdictionId,trigger:'operator'});console.log(JSON.stringify({manualFreshRefresh:result}));if(result.failures.length)process.exitCode=1;}
   }else if(process.argv.includes('--partitioned')){
    for(const id of ids??[])console.log(JSON.stringify({partitionedBackfill:await runPartitionedBackfill(store,{releaseId,id})}));
   }else{const result=await runBackfills(store,{releaseId,ids});console.log(JSON.stringify({backfillResult:result}));if(result.failures.length)process.exitCode=1;}
  }
 }finally{await store.close();}
}
