# Official feed activation: initial validated sources

Requested by Micah with Tyler authorization. This expands the existing application; guest-account gates, King County data and original records remain intact.

Implemented: complete-event Socrata collector with source system IDs, source row-count checks, stable-revision validation and event-first selection. Montgomery accepts the verified native repeat-violation checklist value and retains duplicate native rows under a single unchanged inspection identity. A full-source path is available for inspection-row datasets. Cincinnati, NYC and Austin adapters preserve native results, scores/grades and cities; they are disabled by default. Chicago includes the publisher-required disclaimer.

Activation is deliberately separate from code deployment. First deploy the adapter-capable application. Then run `node backend/feed-activation.mjs --serving=<same deployed SHA>` as the production build preparation for that exact Git revision. It rejects other environments/projects/SHAs, backs up each target's prior catalog/source rows in `feed_activation_backups`, checks exact raw parity and prior revision retention, repeats a captured import, performs a second fresh source refresh, and checks search/profile reads before leaving a source enabled. King County source records are fingerprinted before and after. No browser-accessible migration route or credential export is added. Revert new sources to their backed-up publication states to hide them; inspection rows and revision history remain retained.

The runner fetches the canonical live `/api/release` before any database mutation and requires the expected deployed commit and every required adapter. Both the initial and separately fetched fresh snapshots must contain 25 complete events. Empty or incomplete activation candidates remain unpublished.

The initial activation imports 25 complete recent inspection events per source and labels them Limited Coverage. It does not claim complete histories, all cities, or Cron execution. Full-source/backfill capability is not yet a resumable national archive.

Isolated live-source validation on 2026-11-17 UTC: Montgomery 53 rows/25 inspections; Chicago 25/25; Cincinnati 99/25; NYC 81/25; Austin 25/25. Exact source parity, repeat-import idempotence, failure retention, search and profiles passed in PGlite. Hosted evidence is separate. Workspace evidence: RESEARCH/NAUSEATED_FACE_FEED_IMPORT_VALIDATION_2026_11_16.json.

Chicago full-source validation found 318396 published rows at revision 1794737242; 960 reject existing identity rules and require retained-record handling before a full import. Cincinnati includes undated legacy rows; latest event selection excludes null inspection dates while full-source validation still surfaces them. Delaware lacks a verified unique inspection identity in the tested feed; do not invent one. Marin's ODbL attribution/export treatment, current SF/Dallas source discovery, and the national county/state inventory remain open.

Homepage wording: replace the original cleanup headline with The food-safety watchdog no one asked for; remove its eyebrow/footer duplicates. Source-specific results remain outside King County point rankings.
