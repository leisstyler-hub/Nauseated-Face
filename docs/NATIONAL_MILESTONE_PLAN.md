# National platform vertical slice

Resume branch `gaia/national-expansion` at `2e40b70`; preserve its unfinished public UI. Production remains unchanged until a verified release.

1. Verify and repair saved national migration, identity isolation, indexed search and stable profile links. Keep King County legacy URLs and raw source history.
2. Validate Chicago's official Socrata metadata and limited records. Add a bounded connector for inspection-row datasets; preserve native fields and results. Never apply King County ranking logic to Chicago.
3. Finish location-aware search, pagination, autocomplete, profiles, honest coverage and indexable routes. Run full backend and frontend tests, lint/build and five-width browser QA.
4. Add established server-side authentication and a read-only admin operations slice, with actual source/run/storage metrics. Do not claim account provisioning or hosted credentials until verified.
5. Validate isolated Preview data, failed import recovery, scheduled refresh wiring; publish branch/PR and Preview evidence. Production rollout is a separate release step after verification.

Validation includes overlapping source identifiers, source failures, repeated imports, exact native-row parity, rename-stable profiles, search filters/pagination, keyboard navigation and empty/error states. No synthetic business data enters production.

Open constraints: third-party analytics/ad accounts are unconnected; TN/other source candidates remain inactive until validated. Database size is measurable; provider billing/compute requires its account metrics.

## Review and scope rulings

- Independent review found cross-jurisdiction freshness attribution in legacy King County status. Fixed with per-source status queries and regression tests for both failure orderings. Archived national records now retain their original authority. Per-source last-attempt metrics remain correct beyond the global last-20 display.
- Keep existing King County editorial feed scoped to that jurisdiction; Chicago has its own profiles and city page with official result-only semantics. No national raw-score ranking.
- This slice uses bounded recent samples and per-jurisdiction rebuilds. It is not yet an incremental national archive: cursor backfills, targeted materialization updates, uncertain-record review, full business history, and partitioned sitemaps beyond 5,000 profiles remain next-phase tasks.
- Authentication uses Better Auth with database-backed sessions and owner authorization; public registration is disabled. MFA, recovery email delivery, multiple admin roles, editorial CMS, mutation controls and audit workflows remain pending. No claim that the whole Command Center is complete.
- Preview proves database and handler behavior. Vercel Cron actual scheduled delivery cannot be verified by a manual probe and remains pending production release. No production changes are part of this continuation.
- Ads, Analytics and Search Console are unconnected. Storage usage is measurable; provider billing/compute costs are not integrated. No forecasts or paid services activated.
