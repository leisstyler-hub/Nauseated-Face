import {withTransaction} from './postgres-pilot.mjs';
export async function captureBackfillBackup(store,releaseId,jurisdictionId){
 await store.pool.query(`CREATE TABLE IF NOT EXISTS nf_preview.backfill_backups(release_id text NOT NULL,jurisdiction_id text NOT NULL,captured_at timestamptz NOT NULL DEFAULT now(),previous_catalog jsonb NOT NULL,source_rows jsonb NOT NULL DEFAULT '[]',PRIMARY KEY(release_id,jurisdiction_id))`);
 await store.pool.query(`CREATE TABLE IF NOT EXISTS nf_preview.backfill_backup_rows(release_id text NOT NULL,jurisdiction_id text NOT NULL,source_id text NOT NULL,record jsonb NOT NULL,PRIMARY KEY(release_id,jurisdiction_id,source_id))`);
 await withTransaction(store.pool,async tx=>{
  await tx.query('SELECT pg_advisory_xact_lock(78623491)');
  const captured=(await tx.query('SELECT 1 FROM nf_preview.backfill_backups WHERE release_id=$1 AND jurisdiction_id=$2',[releaseId,jurisdictionId])).rows.length;
  if(captured)return;
  await tx.query(`INSERT INTO nf_preview.backfill_backups(release_id,jurisdiction_id,previous_catalog) SELECT $1,$2,to_jsonb(j) FROM nf_preview.jurisdictions j WHERE id=$2`,[releaseId,jurisdictionId]);
  await tx.query(`INSERT INTO nf_preview.backfill_backup_rows(release_id,jurisdiction_id,source_id,record) SELECT $1,$2,s.source_id,to_jsonb(s) FROM nf_preview.source_rows s WHERE jurisdiction_id=$2`,[releaseId,jurisdictionId]);
 });
}
