# Inspection category pages and navigation implementation plan

Goal: Clear homepage search on every return, move Desk lists to dedicated category routes, and open exact reports from chart points.
Architecture: Shared category metadata drives a lightweight homepage link grid and /rankings/[category] routes. Preserve the existing aggregation and paging API. Reuse shared header/area cookie. Category pages have their own byline, cross-category links, search and home navigation. Chart URLs come from exact saved business/serial/date identity, with official-source links for non-King sources.

- [ ] Reproduce existing home-search retention and missing category-link behavior in browser; add domain tests for category routes and exact history-point hrefs.
- [ ] Split CategoryGrid into homepage navigation and a focused category results component; server loader selects requested category and preserves published-source guards. Unselected visitors see a location prompt, not default records.
- [ ] Add SearchBox clearOnNavigate for homepage only, including submit, suggestion links, internal navigation, pagehide/pageshow and browser history. Keep result-page query visible.
- [ ] Add native SVG anchor links with large transparent click targets and accessible names to chart points. Retain the selection dropdown and dated context; missing report identity never invents a route.
- [ ] Run full backend/frontend suites, lint/build, fresh source review, hosted/public browser flows at 1440/1200/768/390/360, and exact category parity.
- [ ] Update existing PR and deploy through staged production promotion, restore automatic assignment, publish links and limitations.

Rulings: New page means normal same-tab navigation, not an unsolicited new tab. Keep ranking algorithms and native data unchanged. Selected location continues through existing nf-area preference, including on category pages. Category route is shareable by name; a visitor without a selected area must choose one to see records.
