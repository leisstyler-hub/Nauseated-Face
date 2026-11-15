import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';

export function migrationConfig(env = process.env) {
  if (env.NF_ADMIN_MIGRATION_ENABLED !== 'yes') return null;
  const emails = (env.NF_ADMIN_MIGRATION_EMAILS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const url = new URL(env.NF_PNW_SUPABASE_URL || 'https://invalid.example');
  if (emails.length !== 2 || new Set(emails).size !== 2 || emails.some(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) || url.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname) || !env.NF_PNW_SUPABASE_ANON_KEY) throw new Error('Invalid administrator migration configuration');
  return { emails, url: url.origin, key: env.NF_PNW_SUPABASE_ANON_KEY };
}

// No service-role key, persistent provider session, password export, or PNW writes.
export async function verifyPnw(config, credentials, fetcher = fetch) {
  let token;
  const headers = { apikey: config.key, 'Content-Type': 'application/json' };
  try {
    const response = await fetcher(`${config.url}/auth/v1/token?grant_type=password`, { method: 'POST', headers, body: JSON.stringify(credentials), signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!response.ok) return null;
    const body = await response.json();
    token = body.access_token;
    if (!token) return null;
    const user = await fetcher(`${config.url}/auth/v1/user`, { headers: { ...headers, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000), redirect: 'error' });
    return user.ok ? await user.json() : null;
  } finally {
    // Revoke only the temporary verification session; never log PNW users out globally.
    if (token) await fetcher(`${config.url}/auth/v1/logout?scope=local`, { method: 'POST', headers: { ...headers, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000), redirect: 'error' }).catch(() => {});
  }
}

export async function migrateAdmin({ database, config, credentials, verify = verifyPnw }) {
  const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : '';
  if (!config?.emails.includes(email) || typeof credentials.password !== 'string' || !credentials.password.length || credentials.password.length > 4096) return false;
  if ((await database.query('SELECT id FROM "user" WHERE lower(email)=$1', [email])).rows.length) return false;
  const source = await verify(config, { email, password: credentials.password });
  if (!source?.id || source.email?.toLowerCase() !== email || !source.email_confirmed_at || source.factors?.some(factor => factor.status === 'verified')) return false;
  const password = await hashPassword(credentials.password);
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`nf-admin-migration:${email}`]);
    if ((await client.query('SELECT id FROM "user" WHERE lower(email)=$1', [email])).rows.length) { await client.query('ROLLBACK'); return false; }
    const id = randomUUID();
    await client.query('INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt",role) VALUES ($1,$2,$3,true,now(),now(),$4)', [id, 'Nauseated Face Owner', email, 'owner']);
    await client.query('INSERT INTO account (id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES ($1,$2,$3,$2,$4,now(),now())', [randomUUID(), id, 'credential', password]);
    await client.query('INSERT INTO admin_account_migrations (source_user_id,user_id,email) VALUES ($1,$2,$3)', [source.id, id, email]);
    await client.query('COMMIT');
    return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

// Run the ordinary handler first so origin checks and database-backed rate limits
// apply before any provider request. Existing accounts never fall back to PNW.
export async function handleAdminRequest(request, auth, migrate) {
  const candidate = request.method === 'POST' && new URL(request.url).pathname === '/api/auth/sign-in/email';
  const copy = candidate ? request.clone() : null;
  const response = await auth.handler(request);
  if (!copy || response.status !== 401 || !migrate) return response;
  try {
    const raw = await copy.text();
    if (raw.length > 8192) return response;
    const credentials = JSON.parse(raw);
    if (!await migrate(credentials)) return response;
    // Internal login issues the normal signed cookie without a second HTTP rate-limit hit.
    return await auth.api.signInEmail({ body: { email: credentials.email.trim().toLowerCase(), password: credentials.password, rememberMe: false }, headers: copy.headers, asResponse: true });
  } catch { return response; }
}
