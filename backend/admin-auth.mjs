import { betterAuth } from 'better-auth';
import pg from 'pg';
import { directPilotUrl } from './postgres-store.mjs';
import { savedStorageEnabled, productionEnabled } from './production.mjs';
import { migrateAdmin, migrationConfig, handleAdminRequest } from './admin-migration.mjs';

export function createAdminAuth({ database = undefined, secret = '', baseURL = '', provision = false } = {}) {
  if (secret.length < 32) throw new Error('Admin session secret must be at least 32 characters');
  const origin = new URL(baseURL);
  if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) throw new Error('Admin origin requires HTTPS');
  return betterAuth({
    database, secret, baseURL: origin.origin, basePath: '/api/auth', trustedOrigins: [origin.origin],
    emailAndPassword: { enabled: true, disableSignUp: !provision, minPasswordLength: 16, maxPasswordLength: 128 },
    user: { additionalFields: { role: { type: 'string', defaultValue: 'viewer', input: false } } },
    session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 30, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 20, customRules: { '/sign-in/email': { window: 60, max: 5 } } },
    advanced: { useSecureCookies: origin.protocol === 'https:', cookiePrefix: 'nf-admin', defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' } },
    logger: { disabled: true },
  });
}

export async function ownerSession(auth, headers) {
  if (!auth) return null;
  if (process.env.NEON_AUTH_BASE_URL && /neon-auth/.test(headers.get('cookie') ?? '')) {
    const { neonAdmin } = await import('../src/lib/neon-admin.ts');
    const { authorizedNeonSession } = await import('./admin-neon.mjs');
    const result = await neonAdmin()?.getSession();
    const approved = await authorizedNeonSession(auth.options.database, result?.data);
    if (approved) return approved;
  }
  if (!(headers.get('cookie') ?? '').split(';').some(cookie => /^\s*(?:__Secure-)?nf-admin\.session_token=/.test(cookie))) return null;
  const session = await auth.api.getSession({ headers });
  if (session?.user && process.env.NEON_AUTH_BASE_URL) {
    const migrated = await auth.options.database.query('SELECT email FROM admin_access_grants WHERE email=$1 AND accepted_at IS NOT NULL', [session.user.email.toLowerCase()]);
    if (migrated.rows.length) return null;
  }
  return session?.user?.role === 'owner' ? session : null;
}

let configured;
let migrationDatabase;
export function getAdminAuth(env = process.env) {
  const baseURL = env.BETTER_AUTH_URL || (env.VERCEL_ENV === 'preview' && env.VERCEL_URL ? `https://${env.VERCEL_URL}` : '');
  if (!savedStorageEnabled(env) || !env.BETTER_AUTH_SECRET || !baseURL) return null;
  if (!configured) {
    const schema = productionEnabled(env) ? 'nf_admin_production' : 'nf_admin_preview';
    const database = new pg.Pool({ connectionString: directPilotUrl(env), options: `-c search_path=${schema}`, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 });
    migrationDatabase = database;
    configured = createAdminAuth({ database, secret: env.BETTER_AUTH_SECRET, baseURL });
  }
  return configured;
}

export async function adminRequest(request, env = process.env) {
  const auth = getAdminAuth(env);
  if (!auth) return Response.json({ error: 'Administrator sign-in is not configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  if (env.NEON_AUTH_BASE_URL && request.method === 'POST' && new URL(request.url).pathname === '/api/auth/sign-in/email') {
    const body = await request.clone().json().catch(() => null);
    if (typeof body?.email === 'string') {
      const migrated = await auth.options.database.query('SELECT email FROM admin_access_grants WHERE email=$1 AND accepted_at IS NOT NULL', [body.email.trim().toLowerCase()]);
      if (migrated.rows.length) return Response.json({ error: 'Use your invited account credentials' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
  }
  const config = migrationConfig(env);
  return handleAdminRequest(request, auth, config ? credentials => migrateAdmin({ database: migrationDatabase, config, credentials }) : null);
}
