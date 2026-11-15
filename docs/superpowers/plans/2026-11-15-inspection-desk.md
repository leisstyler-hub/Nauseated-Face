# Inspection Desk implementation plan

Goal: Deploy real location-scoped categories from saved official history, with Recent Comebacks over 30 days.
Architecture: Pure jurisdiction-specific aggregate engine, bounded read-only store query, async server loader and interactive category panel. Existing records and source identity remain unchanged.
Tech stack: Existing Next/React/Postgres, no new dependencies.
Spec: RESEARCH/NAUSEATED_FACE_INSPECTION_DESK_AUDIT_2026_11_15.md plus Tyler approval to deploy and rolling-30-day comeback choice.

## Global constraints
- Preserve native data. No writes or schema migration needed.
- Selected location only; explicit Greater Seattle suggestion when slots cannot be filled.
- King County routine inspections only for comparable point rankings; no educational/return-score awards.
- Previous completed calendar month for monthly lists; last 30 calendar dates for comebacks, Pacific dates.
- History trends: latest up to three routine inspections in 24 months, latest within 12 months; repeated codes across latest two distinct inspection dates.
- Clean Plate: minimum two valid routine scores in 24 months, latest within 12 months; latest three mean ascending, then maximum ascending, latest points ascending, stable business ID. Display sample and dates.
- Closure events remain dated with current status unknown unless explicitly confirmed. Official closure pages may reject runtime access: link to authority, never infer reopening.
- Unsupported scoring strategies visibly unavailable, not empty zero rankings.

## Tasks
- [x] Pure aggregation tests first: windows, score nulls, educational exclusions, exact repeated codes, per-business uniqueness, minimum sample, unknown closure state and unsupported sources. Run full backend suite red then green.
- [x] Add parameterized inspectionDeskHistory(area) query returning histories and violations in one query under enabled-source guards; PGlite integration verifies city aliases and disabled sources.
- [x] Replace placeholder CategoryGrid, add Suspense server loader, responsive lists and explicit history/source/region links. Missing DB is an unavailable state.
- [ ] Full backend/frontend suites, lint/build; independent fresh reread for historical-labeling and boundary errors. Hosted five-width all-category/browser check and source snapshot parity before promotion.
- [ ] Signed commit, push existing PR, staged production build, verify then promote and restore automatic deployment. Publish exact state and closure-source limitation.

Ruling: Public Health HTML rejected automated access (HTTP 403) during audit. Deliver historical closure findings with explicit unknown current status and authority link. Do not synthesize reopening confirmation or silently remove history. This limitation must appear in closeout.
