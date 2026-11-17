# Guest accounts, approval and Watchdog

## Implemented behavior

Google guests have a private `/account` dashboard, chosen public display name, home-city/search-order shortcut, favorites and watched businesses. Watchdog compares the latest saved inspection identity against the guest's last checked identity. This is not an assertion about current safety, and does not alert on every edit to the same inspection or on every historical backfill.

Business profiles expose separate guest reviews: 1–5 stars and 10–3000 characters, one editable review per guest/business. Submissions and edits enter `pending`; only approved versions appear publicly or contribute to the SQL rating average/count. Guests can delete their review and report published reviews. `/admin/reviews` uses the existing verified owner authorization gate to approve/reject the current version and resolve reports. Audit snapshots retain submission/deletion/moderation history.

Private guest records use stable jurisdiction/official business identities, with no foreign key to the establishment materializations that imports delete/reinsert. Disabled jurisdictions are excluded from public guest business views; private saved associations survive. Preview and Production use separate `nf_guests_preview` / `nf_guests_production` schemas, independent of source schemas. Nothing automatically migrates or creates tables during public reads.

## Setup and release gates

No production configuration or guest schema has been changed by this implementation. Do the following in a protected environment before enabling the feature:

1. Configure the existing server-only auth/database variables for the intended environment. Run `backend/guest-prepare.mjs` with `NF_PREPARE_GUESTS=yes`, along with the existing storage/auth environment. It creates additive guest tables in the environment's namespace. It never imports or deletes inspection records.
2. Configure app-owned Google OAuth credentials in the selected Neon Auth branch. Copy that branch's exact provider callback URL from Neon. Add the actual site origin to trusted domains. Do not put Google client secrets in chat, browser code or Git. Official setup: https://neon.com/docs/auth/guides/setup-oauth . Installed SDK: `@neon/auth` 0.8.2.
3. Set `NF_GUEST_ACCOUNTS_ENABLED=yes` when the schema is ready. Set `NF_GOOGLE_SIGNIN_READY=yes` only when provider setup is ready. The guest button uses `/api/auth/neon/sign-in/social`, then `/account/callback`; scoped SDK middleware exchanges the verifier/challenge into secure session cookies before returning to `/account`. Existing administrator grants remain mandatory for all admin routes.
4. Verify real Google consent, callback, reload, sign-out and revoked-session behavior with an authorized human account. A synthetic provider fixture does not prove this live flow. Verify a real owner can moderate while a normal guest receives 401 for the moderation API.
5. Email is optional and defaults off. Configure a verified Resend sender (`RESEND_API_KEY`, `NF_GUEST_EMAIL_FROM`) and separate server-only `NF_GUEST_MAIL_SECRET` of at least 32 characters. Set `NF_WATCHDOG_EMAIL_ENABLED=yes` after testing the sender. The account UI saves guest preference but clearly marks email as pending until all runtime settings are present. Presence of settings is configuration readiness, not evidence of inbox delivery.

Read-only Vercel environment-name inspection during implementation found existing Production Neon auth configuration, but none of these new guest readiness/sender keys. Google provider settings were not inspected in Neon, and no sender integration was provisioned.

## Optional email operation

The protected `/api/guest/watchdog` GET endpoint uses the existing exact `CRON_SECRET` bearer and a separate advisory lock. `vercel.json` proposes daily execution at 12:45 UTC, after the existing 12:15 source refresh. This schedule is code configuration, not proof of an observed run. Processing is bounded to 50 candidate watches per invocation; size/frequency should be reviewed against real opt-in volume before promising timely delivery at scale.

Outbox payloads are immutable per user/business/latest-inspection identity, with a stable provider idempotency key. Retry ordering gives unattempted subscribers priority; terminal rows do not consume the batch. Recipient failures are counted and do not abort other recipients. The sender rechecks opt-in, watched status, verified-email snapshot and source availability before requesting delivery. Sending is outside source-import transactions. A changed verified email cancels an existing payload rather than sending to an old address.

Resend retains idempotency keys for 24 hours. Ambiguous requests older than 23 hours are marked `uncertain` for manual investigation rather than automatically resent; this can leave an alert undelivered. Provider acceptance does not establish inbox arrival. Reference: https://resend.com/docs/api-reference/emails/send-email and https://resend.com/docs/dashboard/emails/idempotency-keys . No real emails were sent in local verification.

Each email contains a signed unsubscribe link, with GET confirmation and POST preference change (also supports one-click POST). Unsubscribe works through website maintenance and when guest UI is disabled, provided auth/database configuration remains available. Turning email off does not erase the watch list.

## Verification and limitations

Isolated PGlite checks cover durable saves across business rebuild, cross-user ownership, source visibility, review approval/edit resubmission, optimistic review-version checks, private identity exclusion, opt-in/retry/opt-out, recipient failure continuation, 50 terminal deliveries not starving a new subscriber and environment isolation. The installed SDK callback is exercised against a synthetic local provider, forwarding the verifier and session cookie. The full existing backend/frontend suites, lint/build and five-width browser checks are required before commit.

Browser evidence is under workspace `OUTBOX/NAUSEATED_FACE_GUEST_ACCOUNTS/QA.json`. It exercises account preferences, favorites, watching, pending submission, moderation approval, edit resubmission and signed-out states at 1440,1200,768,390,360px using intercepted API fixtures. Temporary development-only business/moderation fixture pages are removed before the final production build. These are not hosted Google, authenticated Production moderation, or live mail proofs.

No photos, owner replies, helpful votes or review-based search ordering are implemented. Home-city/search-order preferences affect the account search shortcut; they do not silently change all browsing filters. Account data requests use the existing contact route; a self-service account erasure UI is not included.

Rollback: disable the guest feature/readiness/mail flags and restore the prior app revision. Keep additive guest tables, review audit and private saved data intact. Disabling email stops future jobs without changing source records. A separate transfer-optimization commit is not included in this branch.
