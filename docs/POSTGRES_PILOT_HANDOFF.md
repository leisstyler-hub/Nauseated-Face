# Postgres pilot handoff

The implementation is isolated on `gaia/postgres-preview-pilot`, based on backend
revision `630d4d7`. It does not merge or change the live redesign. No production
migration, scheduler, full-county import, or paid upgrade is included.

`PostgresStore` implements asynchronous reads and manual import with a dedicated
`nf_preview` schema. Source collection holds a session advisory lock; data and
successful run history promote in a transaction. Failure preserves committed
records and stores a sanitized error. A failed rollback discards its connection.
Original source strings, raw rows, hashes, revisions and removals are retained.

`POST /api/pilot` requires a verified Preview runtime and an exact bearer token
of at least 32 characters. GET cannot trigger an import. Vercel SSO protection
remains enabled. Use branch-scoped Preview variables `NF_PILOT_VERIFIED=yes`
and sensitive `NF_PILOT_TOKEN`; never expose or commit the token. Database
variables must remain Preview only. No pilot variable creation succeeded yet.

The runner measures five recent complete events, a matching full business
history, exact raw-row parity, unchanged frozen-snapshot reimport, source failure
recovery, real SQL transaction rollback, storage/index bytes and run duration.
It intentionally writes an error run for the failure exercise. After checking
recovery, perform a normal import if a clean latest-attempt status is needed.
It returns sanitized evidence only. Read routes do not migrate or import.

`POSTGRES_LOCAL_OFFICIAL_EVIDENCE.json` is actual official-source evidence using
local PGlite PostgreSQL 18.6, not Neon, hosted durability, countywide capacity or
Vercel timing evidence. It compared 18 rows from five recent events and 20 rows
of one business history, with zero changes on repeat. Synthetic state-transition
tests additionally cover changes, removals, restoration and unsafe scoped moves.

Publication is blocked: normal Git push reports Schannel SEC_E_NO_CREDENTIALS;
OpenSSL transport also exits unsuccessfully; GitHub branch creation returns
403 Resource not accessible by integration. Vercel rejects branch-scoped env
creation until that branch exists remotely. Restore authenticated Git write
access, push the signed branch, then set the two branch-scoped variables and
deploy an isolated Preview. Obtain short-lived protected access for the POST
check, verify unauthenticated access fails, and retain the resulting sanitized
report with the deployment ID and revision. No secrets need to be sent in Buzz.

No Preview was deployed and no Neon connection or import has run. Local build,
lint and full test results are recorded in the workspace work log. Full-county
runtime/storage/history growth and hosted concurrency remain unmeasured. Source
rows are collected in memory and promotion is per-row SQL, so full-county work
requires separate measurement before any schedule or production proposal.
