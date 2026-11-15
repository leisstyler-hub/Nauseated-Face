# Admin traffic and organization implementation plan

**Goal:** Organize private admin destinations and measure daily traffic plus recognized repeat visits.

**Architecture:** Existing owner authentication and Neon admin schema. Add isolated traffic visitors/sessions/events tables using explicit additive deployment setup. Signed HttpOnly first-party random browser cookie; no IP addresses, query strings, account linkage, fingerprints or precise location. Visits split after 30 minutes of inactivity. Report Pacific calendar-day windows for today, last 3/7/30 days and this month. Returning rate is distinct recognized visitors with a returning visit active in the window divided by distinct measured visitors active in the same window. Browser/device changes, blocked tracking and cookie resets limit measurement.

**Choices:** Build on the existing database and PNW smoke-test exclusion pattern rather than a paid external provider. Start collection at release, no historical estimates. Respect DNT/GPC and an opt-out control in Privacy. Admin and known automated clients are excluded; bot filtering is best effort. Finance and Messaging are disabled planned destinations, with no invented data or actions.

- [ ] Tests first: deduplicated events, session boundaries, return numerator/denominator, range boundaries including DST, empty data, errors, owner-only reads and same-origin writes, cookie signatures, exclusions.
- [ ] Add schema, recorder and reporting; collection must not interrupt public pages when unavailable.
- [ ] Add public tracker/privacy disclosure and opt-out, owner traffic reporting with real daily charts and refresh.
- [ ] Split existing sources/import/storage panels into clear routes; add actual owner-account directory and planned Finance/Messaging buttons.
- [ ] Full tests/lint/build, isolated workflow/browser QA at 1440/1200/768/390/360, fresh review.
- [ ] Stage Production without assigning domains; prepare and read back new tables, verify reads and anonymous guards, promote and restore auto-assignment/default builds. Do not seed synthetic production analytics.
