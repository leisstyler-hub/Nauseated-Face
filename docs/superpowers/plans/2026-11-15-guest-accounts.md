# Guest accounts and reviews implementation plan

**Goal:** Google guest profiles with favorites, watched businesses, delivery preferences and approved public reviews.

**Architecture:** Reuse the installed Neon identity/session integration; application guest data uses a separate additive `nf_guests` schema and stable jurisdiction/official-business pairs. Private guest operations derive identity from the verified session. Admin approval remains behind the existing owner gate.

**Spec:** `PLANS/NAUSEATED_FACE_GUEST_ACCOUNTS_AND_REVIEWS_2026_11_15.md` in the Buzz workspace. Tyler approved review approval before publication and user preference for watchdog delivery on November 15 Pacific.

**Constraints:** Preserve existing source data/history/admin permissions. All five viewport widths. No synthetic production users, public reviews, or mail. Hosted Google/provider configuration and deployment are separate from local verification.

## Tasks

- [x] Add isolated PGlite tests for durable favorites/watch records, ownership, review approval/edit resubmission, source visibility, environment isolation and preferences. Implement `backend/guests.mjs` plus additive SQL and explicit preparation script.
- [x] Add boundary tests for unauthenticated/unverified writes, same-origin and size validation; implement guest/public/admin endpoints, rate limits and restricted Google social proxy. Existing owner authorization gates moderation; actual hosted guest-vs-owner verification remains a release gate.
- [x] Add Google sign-in/account and business review panels, private moderation screen, navigation and privacy disclosures. Use authenticated provider IDs and chosen display names only.
- [x] Add opt-in watchdog email outbox/delivery with idempotent retry, per-recipient failures, fairness, uncertain-delivery handling and unsubscribe behavior; keep delivery unavailable unless configured.
- [x] Full local verification: 110 backend tests, 12 frontend tests, lint/build and fixture browser journeys at 1440,1200,768,390,360. Independent reviewer findings corrected and re-reviewed with no remaining blocking findings.
- [ ] Publish the signed focused PR; configure provider/sender and additive hosted schema; verify real Google callback, signed-in guest isolation, real owner moderation and opted-in email before enabling Production.

## Review focus

Cross-user reads/mutations; expired/revoked provider sessions; business materialization delete/reinsert; pending review text/identity leakage; optional email delivery without real sender configuration. Prove these in isolated fixtures and label hosted verification separately.

## Rulings

- Reuse the existing linked worktree on `gaia/guest-accounts`, based on `origin/gaia/national-expansion` at 9149564, leaving the separate transfer commit independent.
- Approval applies to each review version: edits immediately remove old public text until approved again.
- Watches compare latest saved inspection identity, rather than claiming every daily reimport is a new inspection. Email permission defaults off.
