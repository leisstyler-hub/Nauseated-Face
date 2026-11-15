# Greater Seattle and homepage location scope

Tyler requested full Seattle collection, a Greater Seattle category and the existing homepage controlled by chosen location. Reuse the existing national worktree and source pipeline.

Decision: Greater Seattle means King County coverage, explicitly labeled. It does not claim Snohomish or Pierce County. Collect the entire current official King County dataset, retaining source values and revisions. Batch writes and linear grouping are necessary at 111,611 source rows. Daily source refresh should collect the full source with revision validation; failures retain the last committed snapshot. Other sources keep existing bounded collection.

Location selection stores a server-readable preference and navigates to the same homepage, including individual cities. The existing hero, intro, loading eggs, ranking and latest sections remain. The selected location filters before limiting records. Unsupported/non-King areas show their actual saved establishment cards without assigning King County editorial scores. Search uses the selected area; the region includes all King County cities. City directories remain available via Locations. Default Greater Seattle preserves today's countywide content.

Validation: full backend/frontend suites, native source parity/idempotence/preservation, failed import retention, publication gates, city filtering before limits, persistent selection and five responsive widths. Prepare production full import before promotion; report actual source counts and scope, not claims of every restaurant or current safety.

Tyler clarified: homepage always has weekly worst, four worst and eight best for selected city. Weekly highlight must consider every saved inspection in the past seven days, without a 100-event limit. Cards use each business's latest event in that window; no duplicate businesses or cross-city filling.
