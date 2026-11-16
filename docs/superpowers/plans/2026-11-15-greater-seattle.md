# Greater Seattle Implementation Plan

Use executing-plans inline. User has authorized autonomous implementation and fewer approval round trips.

- [x] Add regression tests for large complete imports and city-scoped/publication-gated feeds.
- [x] Batch PostgreSQL writes, remove quadratic grouping; verify exact source/revision parity and rollback. Increase King County full source page size; use complete full-source daily refresh.
- [x] Resolve server location preference, preserve homepage, wire selector, ticker/feed/search to scope; add explicit Greater Seattle region.
- [ ] Run all backend/frontend tests, lint/build. Exercise selection and loaded data at 1440/1200/768/390/360, including empty/off areas.
- [ ] Commit signed, publish PR update, stage full production import with before/after preservation checks; validate hosted source parity and selected homepage; promote and report.
