import assert from 'node:assert/strict';
import {importPostgres} from './postgres-store.mjs';
import {withTransaction} from './postgres-pilot.mjs';

export async function runWindowBackfill(store,{jurisdictionId,revision,rowCount,firstDate,lastDate,source,verifyRevision,policyId='legacy',onWindow=()=>{}}){
 if(!revision||!Number.isSafeInteger(rowCount)||rowCount<1||![firstDate,lastDate].every(v=>/^\d{4}-\d{2}-\d{2}$/.test(v??''))||firstDate>lastDate||typeof verifyRevision!=='function')throw Error('Invalid full-source window inventory');
 const started=new Date().toISOString(),windows=[];
 for(let date=new Date(firstDate.slice(0,7)+'-01T00:00:00Z');date.toISOString().slice(0,10)<=lastDate;){
  const start=date.toISOString().slice(0,10);date.setUTCMonth(date.getUTCMonth()+1);windows.push({type:'window',start,end:date.toISOString().slice(0,10),policyId});
 }
 const previous=(await store.pool.query('SELECT * FROM nf_preview.backfill_windows WHERE jurisdiction_id=$1 AND source_revision=$2 AND policy_id=$3',[jurisdictionId,revision,policyId])).rows;
 let accepted=0,rejectedCount=0,accounted=0,resumedWindows=0;
 for(const scope of windows){
  const saved=previous.find(w=>w.window_start===scope.start&&w.window_end===scope.end);
  let counts;
  if(saved){counts={sourceRowCount:Number(saved.source_row_count),rowCount:Number(saved.accepted_count),rejectedCount:Number(saved.rejected_count)};resumedWindows++;}
  else{
   const snapshot=await source.snapshot(scope);
   if(snapshot.revision!==revision)throw Error('Source changed between backfill windows');
   counts=await importPostgres(store,{snapshot:async()=>snapshot},scope,jurisdictionId);
  }
  accounted+=counts.sourceRowCount;accepted+=counts.rowCount;rejectedCount+=counts.rejectedCount;
  await onWindow({jurisdictionId,window:scope.start,accepted:counts.rowCount,rejectedCount:counts.rejectedCount,accounted,total:rowCount,resumed:!!saved});
 }
 if(accounted!==rowCount)throw Error('Full-source window accounting mismatch; missing dates or unprocessed rows remain');
 assert.equal(await verifyRevision(),true,'Source revision must still match before full-source promotion');
 await withTransaction(store.pool,async tx=>{
  await tx.query('UPDATE nf_preview.quarantined_rows SET active=false WHERE jurisdiction_id=$1 AND source_revision<>$2',[jurisdictionId,revision]);
  await tx.query(`INSERT INTO nf_preview.refresh_runs(started_at,finished_at,status,scope,source_revision,row_count,changed_count,rejected_count,source_row_count,jurisdiction_id,request_urls)
   VALUES($1,$2,'success',$3,$4,$5,0,$6,$7,$8,'[]'::jsonb)`,[started,new Date().toISOString(),JSON.stringify({type:'all',collection:'monthly-windows',windows:windows.length}),revision,accepted,rejectedCount,rowCount,jurisdictionId]);
 });
 return {jurisdictionId,revision,sourceRowCount:rowCount,accepted,rejectedCount,windows:windows.length,resumedWindows};
}
