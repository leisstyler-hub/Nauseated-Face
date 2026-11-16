# Traffic growth implementation plan

**Goal:** Extend the existing private Traffic dashboard to explain growth, public engagement and return behavior. Authorized by Tyler in the Traffic thread: “ok go” and “keep going.”

**Architecture:** Keep the existing first-party PostgreSQL collector and signed browser cookie. Add optional bounded event dimensions and named actions; legacy rows remain page views with unknown dimensions. Aggregate in PostgreSQL inside the existing report snapshot. No raw events leave the server.

**Constraints:** Preserve history and opt-outs. Exclude admin/auth activity. Never store search text, full referrer URLs, credentials or coordinates. Desktop/tablet/mobile verification at 1440,1200,768,390,360. New metrics have their own collection start; incomplete comparisons/cohorts must be marked unavailable.

- [x] Collector: tests first for ranking classification, strict dimensions, idempotent clicks and page-view totals; additive migration and client tracking. Named clicks include search results, restaurants, categories, city selection, full reports, chart points and official sources.
- [x] Reporting: real PostgreSQL fixture tests first for matched elapsed Pacific calendar windows, partial-history comparisons, distinct dimension counts, ordered session journey and mature next-day/7/30-day cohorts. Implement compact aggregate queries.
- [x] Dashboard: growth counts and changes, usage breakdowns, engagement/journey and cohort counts with definitions and empty states. Update privacy disclosure.
- [ ] Verify full backend/frontend suites, lint/build, isolated responsive/browser workflows, fresh review, signed commit/PR and bounded release with exact readback.

Review focus: unknown legacy dimensions, DST windows, zero denominators, incomplete history, asynchronous cookie initialization, private-route exclusions and query/PII stripping.

Review: independent review found unreachable 30-day maturity and missing action event totals. Both fixed; retention uses a separately labeled trailing90-day cohort horizon. Browser fixture tests cover action totals, all date controls, empty/error states and opt-out at all five widths. Existing worktree/PR reused to preserve release lineage.
