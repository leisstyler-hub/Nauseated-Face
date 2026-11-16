# Search across city boundaries and inspection history

Keep city-scoped results first; add a separate, bounded same-state search excluding the canonical selected city and removing jurisdiction restriction. Never expand outside the selected state. Share this behavior between autocomplete and the server search page; label the wider scope and offer a statewide results link. Preserve independent errors and pagination.

Use a shared official-result badge with exact normalized result classification, preserving original wording. Apply it to restaurant summaries/timelines and existing cards. Unsatisfactory is red; satisfactory green; unknown neutral.

Profiles with multiple inspections show chronological dated markers and, only for violation-point sources, a points chart with lower-is-better labels. Null/invalid scores never become zero. Provide selectable record detail, text dates/results and mobile reflow. No trend line implying observations between visits or current safety.

Implement regression tests first for state-bound expansion, canonical city exclusion and point/result normalization. Run complete backend/frontend suites, lint/build. Verify real Prime Steakhouse search and multi-record profiles across five widths, publish through current PR and stage/promote after checks. Preserve all stored rows.
