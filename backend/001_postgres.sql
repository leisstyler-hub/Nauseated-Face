-- Preview-only candidate. Not yet executed against PostgreSQL.
-- Dedicated schema prevents collisions with unrelated application tables.
CREATE SCHEMA IF NOT EXISTS nf_preview;
CREATE TABLE IF NOT EXISTS nf_preview.schema_migrations(version INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS nf_preview.refresh_runs(
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 started_at TEXT NOT NULL, finished_at TEXT,
 status TEXT NOT NULL CHECK(status IN ('running','success','error')),
 scope JSONB NOT NULL, source_revision TEXT,
 row_count BIGINT, changed_count BIGINT, error TEXT, request_urls JSONB
);
CREATE TABLE IF NOT EXISTS nf_preview.source_rows(
 source_id TEXT PRIMARY KEY, event_id TEXT NOT NULL, hash TEXT NOT NULL,
 raw_json TEXT NOT NULL, active BOOLEAN NOT NULL,
 last_run BIGINT NOT NULL REFERENCES nf_preview.refresh_runs(id)
);
CREATE INDEX IF NOT EXISTS source_event ON nf_preview.source_rows(event_id);
CREATE TABLE IF NOT EXISTS nf_preview.row_revisions(
 source_id TEXT NOT NULL, hash TEXT NOT NULL, event_id TEXT NOT NULL,
 raw_json TEXT NOT NULL, first_run BIGINT NOT NULL REFERENCES nf_preview.refresh_runs(id),
 PRIMARY KEY(source_id,hash)
);
CREATE INDEX IF NOT EXISTS revision_event ON nf_preview.row_revisions(event_id);
CREATE TABLE IF NOT EXISTS nf_preview.row_changes(
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 run_id BIGINT NOT NULL REFERENCES nf_preview.refresh_runs(id),
 source_id TEXT NOT NULL, action TEXT NOT NULL,
 old_hash TEXT, new_hash TEXT
);
CREATE INDEX IF NOT EXISTS change_source ON nf_preview.row_changes(source_id);
CREATE TABLE IF NOT EXISTS nf_preview.inspections(
 id TEXT PRIMARY KEY, business_id TEXT NOT NULL, serial TEXT NOT NULL,
 inspection_date TEXT, fields_json TEXT NOT NULL, row_count BIGINT NOT NULL,
 last_run BIGINT NOT NULL REFERENCES nf_preview.refresh_runs(id)
);
CREATE INDEX IF NOT EXISTS inspection_dates ON nf_preview.inspections(inspection_date DESC,id);
CREATE INDEX IF NOT EXISTS business_history ON nf_preview.inspections(business_id,inspection_date DESC);
CREATE TABLE IF NOT EXISTS nf_preview.violations(
 source_id TEXT PRIMARY KEY REFERENCES nf_preview.source_rows(source_id),
 event_id TEXT NOT NULL, type TEXT, description TEXT, points TEXT
);
INSERT INTO nf_preview.schema_migrations VALUES(1) ON CONFLICT DO NOTHING;
