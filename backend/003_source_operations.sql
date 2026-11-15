ALTER TABLE nf_preview.refresh_runs ADD COLUMN IF NOT EXISTS jurisdiction_id TEXT NOT NULL DEFAULT 'wa-king' REFERENCES nf_preview.jurisdictions(id);
ALTER TABLE nf_preview.establishments ADD COLUMN IF NOT EXISTS search_text TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS establishment_national_search ON nf_preview.establishments USING GIN(
 to_tsvector('simple', name || ' ' || coalesce(address,'') || ' ' || coalesce(city,'') || ' ' || coalesce(zip,'') || ' ' || state_code || ' ' || search_text)
);
INSERT INTO nf_preview.schema_migrations VALUES(3) ON CONFLICT DO NOTHING;
