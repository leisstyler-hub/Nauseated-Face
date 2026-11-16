CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS refresh_runs(
 id INTEGER PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT,
 status TEXT NOT NULL, scope TEXT NOT NULL, source_revision TEXT,
 row_count INTEGER, changed_count INTEGER, error TEXT, request_urls TEXT
);
CREATE TABLE IF NOT EXISTS source_rows(
 source_id TEXT PRIMARY KEY, event_id TEXT NOT NULL, hash TEXT NOT NULL,
 raw_json TEXT NOT NULL, active INTEGER NOT NULL, last_run INTEGER NOT NULL REFERENCES refresh_runs(id)
);
CREATE TABLE IF NOT EXISTS row_revisions(
 source_id TEXT NOT NULL, hash TEXT NOT NULL, event_id TEXT NOT NULL,
 raw_json TEXT NOT NULL, first_run INTEGER NOT NULL REFERENCES refresh_runs(id),
 PRIMARY KEY(source_id,hash)
);
CREATE TABLE IF NOT EXISTS row_changes(
 id INTEGER PRIMARY KEY, run_id INTEGER NOT NULL REFERENCES refresh_runs(id),
 source_id TEXT NOT NULL, action TEXT NOT NULL, old_hash TEXT, new_hash TEXT
);
CREATE TABLE IF NOT EXISTS inspections(
 id TEXT PRIMARY KEY, business_id TEXT NOT NULL, serial TEXT NOT NULL,
 inspection_date TEXT, fields_json TEXT NOT NULL, row_count INTEGER NOT NULL,
 last_run INTEGER NOT NULL REFERENCES refresh_runs(id)
);
CREATE INDEX IF NOT EXISTS inspection_dates ON inspections(inspection_date DESC,id);
CREATE INDEX IF NOT EXISTS business_history ON inspections(business_id,inspection_date DESC);
CREATE TABLE IF NOT EXISTS violations(
 source_id TEXT PRIMARY KEY REFERENCES source_rows(source_id), event_id TEXT NOT NULL,
 type TEXT, description TEXT, points TEXT
);
INSERT OR IGNORE INTO schema_migrations VALUES(1);
