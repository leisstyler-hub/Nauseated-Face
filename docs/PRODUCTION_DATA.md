# Production inspection data

Production opts in with `VERCEL_ENV=production` and `NF_STORAGE_MODE=postgres`.
The existing Neon resource supplies server-only `DATABASE_URL_UNPOOLED` using
TLS and a direct endpoint. `nf_production` and advisory lock 78623492 isolate
production writes from `nf_preview` and its failure probes. They share physical
database capacity; this is schema isolation, not a separate Neon project.

`POST /api/refresh` allows an operator refresh. Vercel Cron calls the same
handler with GET daily at 12:15 UTC. Both require the exact `CRON_SECRET` bearer
(at least 32 characters). Public page/API reads do not import. Preview cannot
run this production refresh. Failure responses omit credentials and source
internals; committed records remain available and status reports failures.

Each refresh fetches the latest 100 complete King County inspection events,
validates stable source revision, and commits source rows, revisions, changes,
and materializations atomically. Earlier imported inspections remain saved.
This is a bounded recent sample, not countywide or statewide coverage. History
is marked incomplete unless a complete business/full-source import exists.
Daily imports can miss events when more than 100 arrive between runs; state
expansion requires source adapters and a resumable backfill strategy.

Refresh handler budget: 300 seconds. Daily schedule execution is configured;
an actual scheduled run must be observed before claiming scheduler delivery.
Manual invocation proves the handler, not a future Cron invocation.

Rollback: restore the preceding production deployment. Its source API path
does not use the production opt-in and leaves all saved database records and
audit history intact. Do not use the Preview failure-test runner against this
schema. Export source/detail records to retained release evidence after seed.

Advertising integration and WA/CA/TN expansion are subsequent work; no ad
network, revenue, paid capacity upgrade, or broader coverage is implied here.

## Greater Seattle full-source release, November 15, 2026

King County refresh now requests a complete stable-revision dataset snapshot, with 10,000-row source pages and batched database writes. Source rows, revisions and changes remain atomic and retain provenance. The first verified snapshot contains 111,611 source rows, 75,226 inspection events and 12,359 businesses; Seattle native city records include 34,477 inspections. Actual production evidence is recorded separately. Other enabled jurisdictions retain bounded collection.

Greater Seattle means King County coverage, excluding Pierce and Snohomish County. Homepage location filters every saved inspection from the past seven days before choosing the weekly highlight. The four worst and eight best cards use each business's latest inspection in that window. Full saved histories remain searchable and on profiles. The chosen area is stored in the nf-area preference cookie for one year. Full source capture means all records published by that source at the verified revision, not every inspection ever performed or every operating restaurant.
