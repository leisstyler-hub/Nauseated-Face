# King County inspection API — local implementation

Review increment NF-BACKEND-001. Existing frontend is preserved and still uses its previous source fetch. These endpoints are ready for frontend integration; they have not been publicly released. No hosted database or scheduler has been provisioned.

## Run locally

Requires Node **24.18+**, a writable persistent local disk, and outbound HTTPS to data.kingcounty.gov. No API key or new dependency is needed.

```sh
npm ci
npm run import:inspections -- latest 5
npm run import:inspections -- latest 5
npm run import:inspections -- business PFE-PR-3147569
npm run build
npm start -- --port 3101
```

Alternatively `npm run api:local` serves only these endpoints on **127.0.0.1:3100**. Set `NF_DB_PATH` to an absolute SQLite path to share the database between importer and reader, otherwise both use `.data/inspections.sqlite` relative to their working directory. The database is ignored by Git. Back it up while no importer is running. Migration `backend/001_initial.sql` is idempotent and records version 1.

`npm run import:inspections -- all` performs a full, paginated reconciliation, including changes/removals in older inspections. It is intentionally manual: this may download the entire dataset and retain all raw JSON in memory before an atomic commit. It has not been run against the entire live county dataset. The tested official scope is five recent complete events plus one complete business history. Do not represent this local subset as countywide coverage.

## Read contract

All JSON responses send `Cache-Control: no-store`. Reads never fetch the county service, trigger imports, or return fixtures. Success is HTTP 200; invalid pagination is 400; an unknown/unimported inspection is 404; unavailable storage is 503; unsupported methods are 405. A business with no imported records returns an empty list with explicit coverage.

An entirely removed inspection remains accessible by its previous ID with `active:false`, `completeEvent:false`, no current source rows, and retained revisions/removal history. It is excluded from current lists. This marker describes dataset presence, not business closure. Active inspection detail returns `active:true,completeEvent:true`.

| Request | Response |
| --- | --- |
| `GET /api/inspections?limit=20&offset=0` | `{items,limit,offset,freshness}`; latest **locally known** events, inspection date descending then stable ID |
| `GET /api/inspections/{id}` | `{item,freshness}`; entire event, source rows, normalized violations, raw revisions and change log |
| `GET /api/businesses/{businessId}/inspections?limit=20&offset=0` | `{businessId,complete,completeAsOf,items,limit,offset,freshness}` |
| `GET /api/refresh-status` | global freshness fields plus the latest 20 committed refresh logs |

`limit` is an integer 1–100; `offset` is a nonnegative safe integer. History may be paginated even when `complete:true`: that flag describes imported coverage, not whether the current response includes every page. `completeAsOf` is the last successful full-county or matching business import. A latest-events import alone cannot establish complete business history. A later scoped import does not advance completeAsOf.

Example using a verified official inspection (IDs are opaque SHA-256 of `[business_id,inspection_serial_num]`, not business names):

```sh
curl 'http://localhost:3101/api/inspections?limit=5'
curl 'http://localhost:3101/api/inspections/5972dc7c62f77584d9628ed5229a11da5c284c1dce7d4081c97bfd25890ce0cd'
curl 'http://localhost:3101/api/businesses/PFE-PR-3147569/inspections?limit=100'
curl 'http://localhost:3101/api/refresh-status'
```

A complete, actual four-row detail response is saved in `EXAMPLE_DETAIL.json`; `OFFICIAL_COMPARISON.json` records the independent comparison and exact official URLs.

`fields` keeps original source strings, including numeric-looking scores and historical `inspection_closed_business`. No numeric conversion, current-safety inference, or closure-status inference occurs. `violations` stores source row ID, event ID, original type/description/points; rows without violation type/description are not invented violations.

For frontend integration, fetch list then detail by returned `id`; render `fields`, `violations`, source links and both item and global freshness. Values are untrusted source text and must be rendered as text, never injected as HTML. Do not label the list countywide-latest until full coverage/refresh policy is established. Preserve historical context on any closure finding.

## Freshness and failure semantics

`lastSuccess` is the most recent successful import of **any scope**. `lastSuccessfulScope`, `lastFullImport`, and item `observedAt` prevent that value from implying all records were refreshed. `stale` means no successful observation or more than 24 hours since observation; item-level `stale` uses that item's observation, independently of global freshness. `error` reports the most recent failed attempt; it can coexist with `stale:false` if the last good data is still recent. No successful import means `lastSuccess:null,stale:true`.

Refresh logs record start/end, scope, dataset revision, row/change counts, all successful snapshot request URLs, and errors. During a running transaction readers see the previous committed state. A process kill rolls back SQLite writes; abrupt termination is not recorded as a finished refresh log. A source failure preserves the last good snapshot and logs an error; neither fixtures nor an empty replacement snapshot is silently substituted.

## Import integrity and provenance

Official source: https://data.kingcounty.gov/resource/r878-4sxa.json ; metadata: https://data.kingcounty.gov/api/views/r878-4sxa.json . The inspected schema exposes `business_id`, `inspection_serial_num`, `inspection_date`, violation fields, and Socrata `:id` via explicit `$select=*, :id`.

Latest mode selects grouped business/inspection keys first, ordered by maximum inspection date and stable keys, then fetches **all pages** of each selected event. Business/all modes page all matching rows with explicit `:id` order and offset. Dataset `rowsUpdatedAt` is checked before/after; changes abort the whole import. This detects provider revision changes but cannot promise transactional source snapshots beyond the provider's metadata semantics. Missing keys, duplicate source IDs, or inconsistent shared inspection fields abort visibly.

`source_rows` stores exact parsed source JSON, SHA-256, active marker and run provenance. `row_revisions` retains every distinct content version; `row_changes` records additions, changes, removals and restorations with old/new hashes. Socrata IDs are used within the source lifecycle; if the provider regenerates IDs, a full import records removals/additions rather than inventing a cross-ID match. Removed data remains in revision/change history. Event IDs use the business/serial composite to avoid collisions across businesses. A scoped row move that could leave another event incomplete aborts and requires a full reconciliation.

Imports are serialized with a SQLite writer lock, and data plus successful refresh log commit atomically. Retryable network failures and 429/500/502/503/504 receive at most four attempts, 30-second per-request timeout, bounded exponential delay or Retry-After (numeric/date, maximum 30 seconds). Other HTTP errors fail immediately. No public refresh/write endpoint is exposed.

## Verification and resource decisions

Run `npm test`, `npm run lint`, `npm run build`, then `node backend/verify-live.mjs` against the production-mode local server (`NF_VERIFY_BASE` overrides its URL). The live comparison checks exact official raw records for five recent inspections, and all ten inspections/15 rows in the selected business history using two-row source pages. Repeat-import evidence: 18 rows added, then 18 rows observed with **0 changes**. Changed-record tests use an isolated in-memory database and explicitly synthetic rows, never county records: points 5→10 creates a revision; a removed row remains in change history; failures roll back.

Owner decisions before hosting: durable database/service and budget, initial countywide backfill, refresh cadence/scheduler and monitoring, deployment approval and frontend connection. Local SQLite is explicitly disabled on Vercel: an ephemeral/serverless filesystem does not satisfy durable storage. Node route handlers and local server work on a persistent Node host; a hosted adapter is a separate scoped increment. No automatic public release is included. Existing frontend verification, responsive work, TikTok and X are outside this backend increment.
