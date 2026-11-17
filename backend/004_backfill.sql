-- Rejected official originals remain independent of public entity identity.
CREATE TABLE IF NOT EXISTS nf_preview.quarantined_rows(
 jurisdiction_id TEXT NOT NULL REFERENCES nf_preview.jurisdictions(id),
 source_revision TEXT NOT NULL, official_row_id TEXT NOT NULL,
 imported_source_id TEXT NOT NULL, raw_json TEXT NOT NULL, reason TEXT NOT NULL,
 active BOOLEAN NOT NULL DEFAULT true,
 first_run BIGINT NOT NULL REFERENCES nf_preview.refresh_runs(id),
 PRIMARY KEY(jurisdiction_id,source_revision,official_row_id)
);
ALTER TABLE nf_preview.refresh_runs ADD COLUMN IF NOT EXISTS rejected_count BIGINT NOT NULL DEFAULT 0;
ALTER TABLE nf_preview.refresh_runs ADD COLUMN IF NOT EXISTS source_row_count BIGINT;
ALTER TABLE nf_preview.refresh_runs ADD COLUMN IF NOT EXISTS trigger_kind TEXT NOT NULL DEFAULT 'operator';
ALTER TABLE nf_preview.refresh_runs ADD COLUMN IF NOT EXISTS request_meta JSONB;
CREATE TABLE IF NOT EXISTS nf_preview.backfill_windows(
 jurisdiction_id TEXT NOT NULL REFERENCES nf_preview.jurisdictions(id),
 source_revision TEXT NOT NULL, window_start TEXT NOT NULL, window_end TEXT NOT NULL,
 source_row_count BIGINT NOT NULL, accepted_count BIGINT NOT NULL, rejected_count BIGINT NOT NULL,
 run_id BIGINT NOT NULL REFERENCES nf_preview.refresh_runs(id),
 policy_id TEXT NOT NULL DEFAULT 'legacy',
 PRIMARY KEY(jurisdiction_id,source_revision,window_start,window_end)
);
INSERT INTO nf_preview.schema_migrations VALUES(4) ON CONFLICT DO NOTHING;
