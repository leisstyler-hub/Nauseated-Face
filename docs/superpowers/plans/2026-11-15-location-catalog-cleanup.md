# Location list cleanup and coverage disclosure

Tyler reported repeated Washington cities and proposed sorting by record count. Use saved inspection counts descending in Washington, with alphabetical tie breaks. Merge capitalization, whitespace, punctuation and explicit known locality aliases only; preserve native inspection values. Use official Census Washington place names to avoid promoting typos or ambiguous strings as cities. Unmatched records remain in regional data/search. Counts and city filtering must share the same canonical keys.

Show Data Available only with successful full-source import evidence. Retain partial sample labels elsewhere. Clarify Last refreshed versus historical record date. Add a concise public Data Sources & Coverage view with actual source/date ranges and refresh information, linked unobtrusively from the footer and location pages. Update outdated 100-record methodology text.

Validate pure catalog normalization/count ordering and SQL canonical filtering with native raw preservation, then full suites/lint/build and selector/location/coverage pages at 1440/1200/768/390/360. Publish through existing gaia/national-expansion PR and verify the live source counts and ordering. No new source import or production data mutation is required.
