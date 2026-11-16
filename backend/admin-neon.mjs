import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const ACCESS_SCHEMA = `CREATE TABLE IF NOT EXISTS admin_access_grants (
  email text PRIMARY KEY, name text NOT NULL, neon_user_id text UNIQUE,
  invited_by text NOT NULL, invited_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
  accepted_at timestamptz, revoked_at timestamptz,
  last_sent_at timestamptz
); CREATE TABLE IF NOT EXISTS admin_email_requests (request_key text PRIMARY KEY, last_at timestamptz NOT NULL DEFAULT now());`;

export async function recoverAdministrator({ database, email, ip, origin, baseURL, send = sendAccessEmail }) {
  const generic = { status: true, message: 'If this email exists in our system, check your email for the reset link' };
  const key = value => createHash('sha256').update(value).digest('hex');
  for (const value of [`ip:${ip}`, `email:${email}`]) {
    const allowed = await database.query(`INSERT INTO admin_email_requests(request_key) VALUES($1)
      ON CONFLICT(request_key) DO UPDATE SET last_at=now() WHERE admin_email_requests.last_at<now()-interval '60 seconds' RETURNING request_key`, [key(value)]);
    if (!allowed.rows.length) return { status: 429, body: { error: 'Please wait a minute before requesting another email.' } };
  }
  const existing = await database.query(`SELECT name FROM "user" WHERE lower(email)=$1 AND role='owner'
    UNION ALL SELECT name FROM admin_access_grants WHERE email=$1 AND revoked_at IS NULL AND (accepted_at IS NOT NULL OR expires_at>now()) LIMIT 1`, [email]);
  if (!existing.rows.length) return { status: 200, body: generic };
  try { await send({ email, name: existing.rows[0].name, origin, baseURL }); }
  catch { return { status: 503, body: { error: 'Email service temporarily unavailable. Please retry later.' } }; }
  return { status: 200, body: generic };
}

export async function authorizedNeonSession(database, session) {
  const user = session?.user;
  if (!user?.id || user.emailVerified !== true || typeof user.email !== 'string') return null;
  const email = user.email.trim().toLowerCase();
  // Existing local owners retain eligibility, but still must prove their mailbox to Neon.
  const owners = await database.query('SELECT id,name FROM "user" WHERE lower(email)=$1 AND role=$2', [email, 'owner']);
  if (owners.rows.length) await database.query(`INSERT INTO admin_access_grants(email,name,invited_by) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING`, [email, owners.rows[0].name, owners.rows[0].id]);
  // Pin the provider identity once. A revoked/expired invitation or different provider ID cannot pass.
  const result = await database.query(`UPDATE admin_access_grants SET neon_user_id=$2,accepted_at=coalesce(accepted_at,now())
    WHERE email=$1 AND revoked_at IS NULL AND (accepted_at IS NOT NULL OR expires_at>now())
    AND (neon_user_id IS NULL OR neon_user_id=$2) RETURNING name`, [email, user.id]);
  if (!result.rows.length) return null;
  return { ...session, user: { ...user, id: `neon:${user.id}`, name: result.rows[0].name, role: 'owner' } };
}

export async function sendAccessEmail({ email, name, origin, baseURL, fetcher = fetch }) {
  const call = (path, body) => fetcher(`${baseURL}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(15000) });
  // No known password is ever sent or retained. Signup cookies are deliberately discarded.
  const created = await call('sign-up/email', { email, name, password: randomBytes(48).toString('base64url'), callbackURL: `${origin}/admin/login` });
  const body = await created.json().catch(() => ({}));
  if (!created.ok && !['USER_ALREADY_EXISTS', 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'].includes(body.code)) throw new Error('Invitation email could not be prepared');
  const response = await call('request-password-reset', { email, redirectTo: `${origin}/admin/reset-password` });
  if (!response.ok) throw new Error('Invitation email could not be sent');
}

export async function inviteAdministrator({ database, actor, name, email, origin, baseURL, send = sendAccessEmail }) {
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`nf-invite:${email}`]);
    const previous = (await client.query('SELECT * FROM admin_access_grants WHERE email=$1', [email])).rows[0];
    if (previous?.last_sent_at && Date.now() - new Date(previous.last_sent_at).getTime() < 60000) { await client.query('ROLLBACK'); return { status: 429, body: { error: 'Please wait a minute before resending.' } }; }
    await client.query(`INSERT INTO admin_access_grants(email,name,invited_by) VALUES($1,$2,$3)
      ON CONFLICT(email) DO UPDATE SET name=excluded.name,invited_by=excluded.invited_by,invited_at=now(),expires_at=now()+interval '7 days'
      WHERE admin_access_grants.revoked_at IS NULL`, [email, name, actor]);
    if (previous?.revoked_at) { await client.query('ROLLBACK'); return { status: 409, body: { error: 'This access grant is revoked.' } }; }
    await send({ email, name, origin, baseURL });
    await client.query('UPDATE admin_access_grants SET last_sent_at=now() WHERE email=$1', [email]);
    await client.query(`INSERT INTO admin_control_runs(id,actor_id,action,finished_at,status,summary) VALUES($1,$2,'admin-invitation',now(),'success',$3)`, [randomUUID(), actor, JSON.stringify({ email })]);
    await client.query('COMMIT');
    return { status: 200, body: { sent: true } };
  } catch { await client.query('ROLLBACK'); return { status: 503, body: { error: 'Invitation could not be completed. Email may have been delivered; retry after checking status.' } }; }
  finally { client.release(); }
}

export async function accessRequest(request, session, invite) {
  const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (session?.user?.role !== 'owner') return reply(401, { error: 'Unauthorized' });
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply(403, { error: 'Invalid request origin' });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(400, { error: 'Invalid request' });
  try {
    const raw = await request.text(); if (raw.length > 2048) return reply(400, { error: 'Invalid request' });
    const body = JSON.parse(raw);
    if (typeof body.email !== 'string' || typeof body.name !== 'string' || body.admin !== true || Object.keys(body).length !== 3) return reply(400, { error: 'Enter name and email, and check Admin to grant administrator access.' });
    const email = body.email.trim().toLowerCase(), name = body.name.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 100) return reply(400, { error: 'Enter a valid name and email' });
    const result = await invite({ actor: session.user.id, name, email });
    return reply(result.status, result.body);
  } catch { return reply(503, { error: 'Invitation temporarily unavailable' }); }
}
