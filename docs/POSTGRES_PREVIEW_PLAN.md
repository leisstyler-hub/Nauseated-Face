# Postgres preview pilot implementation plan

Approved scope: isolated Neon Free preview pilot, Portland, no paid upgrade,
production migration or schedule. Preserve backend PR #2 and the live redesign.

Architecture: retain the source client and endpoint contract, add an asynchronous
Postgres repository. Store original parsed strings as JSON text; JSONB is used
only for queryable run scope. Never expose connection details in API errors.
Use a dedicated pilot schema, session advisory lock and transactional promotion.
Readers must keep seeing the last committed snapshot during source collection.

- [ ] Prepare isolated schema, preview-only execution guard, transaction cleanup
  and source snapshot validation. Prove rollback/release and malformed-source
  rejection locally with injected clients; these are synthetic protocol tests.
- [ ] Implement asynchronous read repository and importer preserving revision,
  removal, coverage and freshness semantics. Test against isolated Postgres.
- [ ] Verify resource ID, Free plan, Portland and Preview-only connection before
  any remote SQL. Install driver only once the connection design is established.
- [ ] Run full tests/lint/build, official source parity, unchanged reimport,
  failed import recovery and storage/index/history/runtime measurements.
- [ ] Publish signed review branch through authenticated Git workflow. No release.

Remaining gate: secure preview credentials/resource verification. No local
protocol test is evidence of successful SQL execution or hosted durability.
