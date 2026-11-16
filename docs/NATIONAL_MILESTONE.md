# National vertical slice

Development branch: `gaia/national-expansion`, continuing `2e40b70`. Existing production release remains separate.

## Implemented

- National search API and server-rendered search, state/city routes, remembered location picker, keyboard autocomplete, location filters, date/name/result sorting and bounded pagination.
- Shareable establishment profiles with every saved violation, timeline, historical-context labels, authority links and related local records. Existing King County inspection URLs remain intact. Chicago is never assigned a King County score or ranking.
- Configuration-driven Socrata collector for verified inspection-row datasets, with bounded pagination, retry/backoff, revision checks, stable identities and full native Chicago fields retained under `:original`. King County keeps its complete-event collector.
- Imports separate source keys and event identities by jurisdiction; preserve King County legacy IDs, raw rows/revisions/change history, retain old snapshots on failure and scope materialization rebuilds to one jurisdiction. Profiles retain their slug across renames.
- Source enablement gates public search/profile/indexing. Coverage labels depend on actual saved establishments and source activation. Unsupported/empty cities are not indexed. Canonicals, breadcrumbs, robots and sample-scale sitemap included.
- Better Auth server sessions, private owner role, disabled public signup, database-backed login rate limits, logout revocation, `/admin` operations and protected read API. Actual establishment/inspection/source/run/storage measurements; third-party metrics explicitly unconnected.
- Enabled-source collector integrated with the existing protected production refresh handler. Sources fail independently; last committed records remain available. This does not prove future Cron delivery.

## Schema and files

`003_source_operations.sql` adds jurisdiction attribution to sync runs, searchable national text and its GIN index. `002_national.sql` remains additive; King County default coverage is limited. No source rows/revisions are dropped. Registry seeding preserves runtime activation choices.

Public routes/components: `src/app/[state]`, `search`, `locations`, `restaurants`, `api/search`, `sitemap.ts`, `robots.ts`; `LocationSelector`, `SearchBox`, `EstablishmentCard`, header/hero/footer. Admin: `backend/admin-auth.mjs`, `admin-setup.mjs`, `src/app/admin`, `api/auth`, `api/admin/operations`. Source pipeline: `backend/socrata.mjs`, `adapters/il-chicago.mjs`, `sync.mjs`, `national-pilot.mjs`, store/migration changes.

## Credentials and setup

Server-only Neon direct TLS endpoint: existing `DATABASE_URL_UNPOOLED`. Preview uses `nf_preview`; production uses `nf_production` with an independent advisory lock. They share physical capacity.

Admin uses `BETTER_AUTH_SECRET` (32+ high-entropy characters) and `BETTER_AUTH_URL` (HTTPS origin). In Preview only, the origin may derive from the runtime `VERCEL_URL`. Auth tables use separate `nf_admin_preview` / `nf_admin_production` schemas and Better Auth's own migrations.

An operator provisions the first owner privately using `node backend/admin-setup.mjs`: supply `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` (16+ characters), `NF_ADMIN_PROVISION_AUTHORIZED=yes`, and the verified environment/connection/auth settings. The command creates auth tables and stops if an owner exists. Passwords never belong in command arguments or chat. Clear the initial password from the operator environment afterward. Owner credentials/account provisioning have not been claimed.

The existing authenticated Preview probe accepts `POST /api/pilot?suite=national` with `NF_PILOT_TOKEN`; it migrates only Preview, imports small official samples, compares exact rows, reimports, tests source failure retention and activates validated sources. It never runs in production. Public reads do not collect data or create tables.

## Validation and remaining work

Local source evidence: `NATIONAL_SOURCE_VALIDATION.json` (18 King County source rows in 5 complete events; 25 Chicago complete inspection rows; unchanged repeat imports; source failure retention; real database search/profile reads). PGlite executes PostgreSQL locally; it is not hosted Neon evidence.

Independent review identified a cross-source legacy freshness attribution defect. Fixed with per-jurisdiction status queries and regression tests in both failure orderings. Archived-detail authority, per-source latest attempts beyond 20 global runs, publication gates and production storage namespace were corrected as well.

Remaining: owner provisioning and hosted login validation, MFA/recovery, source mutation controls/audit workflows, editorial studio, corrections queue, ads/analytics connections, complete histories, incremental cursors/backfills, source quality review queues, query/load testing at national scale, and sitemap partitioning above 5,000 profiles. The current bounded collector can miss records beyond its window. Per-jurisdiction materialization rebuilds are suitable for this controlled sample, not an assertion of million-record ingest readiness.

Vercel Cron executes in production. Preview/manual collector tests do not prove scheduled delivery. Production release and its first observed scheduled run remain separate verification steps. No paid service or advertising is activated.
