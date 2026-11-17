# Inspection backfill operations

Use the existing authorized production project runtime. Never export database credentials to the browser or logs. This is an operator CLI, not a public migration endpoint.

1. Publish schema-4-compatible adapter code first. Build with `node backend/backfill-run.mjs --migrate-only && npm run build` so additive tables exist when code serves. Preserve existing guest/auth settings.
2. Verify `/api/release` matches the exact signed SHA and required adapters.
3. For sources up to 500000 rows: `node --max-old-space-size=6144 backend/backfill-run.mjs --serving=SHA --sources=tx-austin,ca-san-francisco,ca-marin,de-state`. It captures prior state row by row, imports accepted complete events and rejected originals, checks repeat import, sample raw parity, search/profile and King County preservation. Labels remain limited when quarantines remain.
4. For large sources: `node --max-old-space-size=6144 backend/backfill-run.mjs --serving=SHA --sources=md-montgomery,il-chicago,oh-cincinnati,ny-nyc --partitioned`. Each complete monthly window commits records and its checkpoint together. Restart the same SHA/source revision to skip committed windows. Changed source revision or code policy requires new accounting. All rows, including rejected rows, must reconcile to the official source inventory before full-source completion is recorded.
5. Verify hosted counts/date ranges and representative original source records, search and profiles. Verify coverage at 1440/1200/768/390/360px. A configured schedule is not an observed invocation. Successful authenticated Vercel Cron requests record their schedule separately from operator imports; public coverage reports that evidence.

Raw download pages use atomic checksummed checkpoints bound to official dataset revision/query/page size. Durable imported-window checkpoints live in PostgreSQL. An ephemeral build losing its local cache can re-fetch the uncommitted window without reimporting completed windows.

Daily authority-scoped refreshes reconcile complete 45-day windows, retain older history, retire publisher-removed in-window rows without deleting originals/revisions, and preserve existing valid records for quarantined events. Updates outside the 45-day overlap need another full backfill; full historical correction monitoring is not implied.

Marin export: `/api/source-export?jurisdiction=ca-marin`, newline-delimited JSON under ODbL with original fields and explicit quarantine entries. No other authority or private account tables are exportable there.

Rollback: disable affected source publication and refresh switches while retaining records, revisions, quarantine and backups. Schema 4 is additive, but earlier code's strict schema-version guard is incompatible with it. Do not deploy pre-schema-4 code as a blind rollback; use a schema-4-compatible forward fix. Rowwise backups are in `nf_production.backfill_backups` and `nf_production.backfill_backup_rows`; capture is serialized against importers. Restore only reviewed source scope and verify exact readback. No automatic restore deletes newly collected history.
