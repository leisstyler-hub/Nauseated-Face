# Connect the existing site to saved inspection records

Integration branch: gaia/database-connected-site, based on the live redesign
74a314b with the reviewed pilot e2fbb0b merged locally. Existing deployments
remain unchanged until deployment scope is confirmed by Tyler.

1. Add a read-only saved-feed loader. Use current imported inspection IDs,
   retrieve their complete raw rows and retain status/observed timestamps.
   Test empty coverage, complete rows and unavailable/inconsistent storage.
2. Reuse the current rendering model and source fields. In the configured
   Preview, server rendering reads Postgres directly; no self-HTTP calls,
   client credentials, page-triggered imports or silent county fallback.
3. Display import freshness and imported-sample coverage accurately. Preserve
   the live visual design, source links and historical interpretation.
4. Run the full backend suite, lint and build. Verify the actual saved-record
   page at 1440, 1200, 768, 390 and 360 pixels, plus unavailable/empty states.
5. Publish reviewable code and an isolated Preview after confirmed scope.
   Production credentials/release, schedules and paid changes require explicit
   authorization beyond the prior pilot. Full county capacity remains open.
