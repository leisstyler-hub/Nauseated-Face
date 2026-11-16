-- National expansion: jurisdiction-aware entities. Existing King County rows
-- are backfilled as jurisdiction 'wa-king' so saved records and URLs keep working.
CREATE TABLE IF NOT EXISTS nf_preview.jurisdictions(
 id TEXT PRIMARY KEY, state_code TEXT NOT NULL, state_name TEXT NOT NULL,
 name TEXT NOT NULL, health_authority TEXT NOT NULL, source_url TEXT NOT NULL,
 scoring_json TEXT NOT NULL,
 coverage_status TEXT NOT NULL CHECK(coverage_status IN ('available','limited','coming_soon','unavailable')),
 enabled BOOLEAN NOT NULL DEFAULT false, refresh_frequency TEXT, last_synced_at TEXT
);
INSERT INTO nf_preview.jurisdictions
 VALUES('wa-king','WA','Washington','King County','Public Health — Seattle & King County',
  'https://data.kingcounty.gov/Health/Food-Establishment-Inspection-Data/f29f-zza5',
  '{"type":"violation_points","direction":"lower_is_better"}','limited',true,'daily',NULL)
 ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS nf_preview.establishments(
 id TEXT PRIMARY KEY,
 jurisdiction_id TEXT NOT NULL REFERENCES nf_preview.jurisdictions(id),
 official_id TEXT NOT NULL, name TEXT NOT NULL, address TEXT, city TEXT,
 state_code TEXT NOT NULL, zip TEXT,
 latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, slug TEXT NOT NULL,
 latest_inspection_date TEXT, latest_result TEXT, latest_score TEXT,
 inspection_count BIGINT NOT NULL DEFAULT 0,
 last_run BIGINT NOT NULL REFERENCES nf_preview.refresh_runs(id),
 UNIQUE(jurisdiction_id, official_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS establishment_slug ON nf_preview.establishments(state_code, slug);
CREATE INDEX IF NOT EXISTS establishment_city ON nf_preview.establishments(state_code, lower(city), lower(name));
CREATE INDEX IF NOT EXISTS establishment_search ON nf_preview.establishments
 USING GIN(to_tsvector('simple', name || ' ' || coalesce(address,'') || ' ' || coalesce(city,'') || ' ' || coalesce(zip,'')));
ALTER TABLE nf_preview.inspections ADD COLUMN IF NOT EXISTS jurisdiction_id TEXT NOT NULL DEFAULT 'wa-king';
ALTER TABLE nf_preview.inspections ADD COLUMN IF NOT EXISTS establishment_id TEXT;
ALTER TABLE nf_preview.source_rows ADD COLUMN IF NOT EXISTS jurisdiction_id TEXT NOT NULL DEFAULT 'wa-king';
CREATE INDEX IF NOT EXISTS inspection_establishment ON nf_preview.inspections(establishment_id, inspection_date DESC);
INSERT INTO nf_preview.schema_migrations VALUES(2) ON CONFLICT DO NOTHING;
