# Administrator invitations and recovery

Administrator approval lives in the application's private `admin_access_grants` table. Neon manages identities, password hashing, email verification and reset tokens. Neon account creation alone grants no private access. Only existing owners or unexpired owner-issued invitations may bind a verified Neon identity. Once bound, the identity ID must continue to match, and revocation takes effect on the next access check.

## Configuration

- Set `NEON_AUTH_BASE_URL` to the selected production branch's managed Auth URL. This application is Next.js; a Vite environment prefix is not used.
- Existing `BETTER_AUTH_SECRET` signs the Neon SDK's local cookies as well as the legacy session implementation. Keep it server-only.
- In Neon, allow `https://www.nauseated-face.app` as a trusted redirect domain, enable email sign-in/signup and verification, and enable session revocation on password reset. Public provider signup stays separate from application authorization.
- Run the authorized, additive `backend/admin-prepare.mjs` setup to create access/recovery tables before enabling the feature.

## Flow and migration

An owner enters the recipient's name and email in Admin Access. The application approves that address for seven days, creates a Neon identity with an unretained random password if needed, and requests Neon's native password setup/reset email. The recipient may also receive Neon's verification email. Password setup requires 16–128 characters and confirmation, then returns to login. The recipient completes email verification before private access is allowed. The UI labels all invited access as full owner access.

Existing owners retain their current login until their first verified Neon sign-in. That sign-in pins their new identity; subsequent legacy sign-ins and legacy sessions no longer authorize that account. During this one-time transition, resetting the Neon password does not itself change the separate legacy password. Complete verified Neon sign-in to finish migrating an existing owner; do not describe a pending migration as fully cut over.

Recovery accepts only existing local owner records or active application invitations. Unknown addresses receive the same generic success message but are not created or emailed. Public recovery is throttled per email and source address. Reset links and verification are managed by Neon; email-provider acceptance does not prove inbox delivery.

Invitations are audited in `admin_control_runs`. Failed delivery requests roll back approval; if a provider accepted mail before a later database failure, a message might still arrive, but it does not bypass the approval check. Original inspection data and previous local account records are retained.

## Verification boundaries

Use isolated fixtures for privilege checks, invitation expiration, provider-ID binding, revocation, provider failures and recovery throttling. Browser tests may intercept email responses to avoid sending test mail; label those separately from real delivery and signed-in production evidence. Never create synthetic production owners to pass a smoke test.
