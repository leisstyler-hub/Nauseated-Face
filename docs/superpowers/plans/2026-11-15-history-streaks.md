# Full-history streaks and faster Inspection Desk

Requested behavior: Repeat Offenders shows every consecutive routine-inspection occurrence of each code ending at the latest routine date. Clean Plate recognizes longer current zero-point streaks and displays full saved routine history. Preserve source records and current-condition disclaimers.

Evidence: Official saved snapshot for PFE-PR-3141454 shows 3200 on June 14 2024, March 20 2025, August 21 2025 and May 21 2026. Current code only compares two dates and loads two years. Baseline browser result-ready timings were 5666/2401/2323 ms.

Implementation: Load all saved routine history with a scoped violation aggregation and only the three desk fields crossing the database boundary. Reuse a short-lived report cache keyed by jurisdiction, state, city, Pacific date and offset; check live availability outside the cache. Invalidate on source refresh and availability changes. Add the existing egg loader during category navigation. Rank current zero-point streaks of >=2 first, then full-history mean and explicit tie breaks. Exclude unknown-score histories and non-routine visits from awards.

Validation: Domain tests for four-repeat and five-clean streaks, interruption and same-day deduplication; full package suites; hosted parity against the official saved snapshot; timings and desktop/tablet/mobile flows. No schema, credentials or inspection mutations.
