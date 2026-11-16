# Website availability implementation plan

**Goal:** Owner can pause and restore the public website, with a warning before pausing and a branded spinning-egg maintenance screen.

**Architecture:** Reuse the existing admin audit table: the newest website-availability event is the durable state, defaulting to on. Proxy checks uncached state before public pages and APIs; admin, authentication, refresh and static assets remain reachable. No inspection rows or credentials change. Reuse the logo and egg CSS; respect reduced motion.

**Decision:** Use existing database controls rather than deployment variables (which require redeploys). User requested execution and reduced back-and-forth; routine design decisions are resolved here. Message: We are freshening things up. Nauseated Face will be back soon.

- [ ] Add database, authorization, confirmation and routing tests; observe missing-feature failure.
- [ ] Implement durable audited state and owner-only API; no live availability changes during verification.
- [ ] Add warning dialog, recovery switch, maintenance page and request gate; preserve admin recovery.
- [ ] Run full backend/frontend tests, lint and production build; check maintenance and dialog at 1440/1200/768/390/360, keyboard, reduced motion and cancel/restore.
- [ ] Self-review exact diff and attribution, commit, publish through existing PR, deploy and verify live without disabling production.
