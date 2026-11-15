import { betterAuth } from 'better-auth';
import pg from 'pg';
import { directPilotUrl } from './postgres-store.mjs';
import { savedStorageEnabled, productionEnabled } from './production.mjs';

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
  const session = await auth.api.getSession({ headers });
  return session?.user?.role === 'owner' ? session : null;
}

let configured;
export function getAdminAuth(env = process.env) {
  const baseURL = env.BETTER_AUTH_URL || (env.VERCEL_ENV === 'preview' && env.VERCEL_URL ? `https://${env.VERCEL_URL}` : '');
  if (!savedStorageEnabled(env) || !env.BETTER_AUTH_SECRET || !baseURL) return null;
  if (!configured) {
    const schema = productionEnabled(env) ? 'nf_admin_production' : 'nf_admin_preview';
    const database = new pg.Pool({ connectionString: directPilotUrl(env), options: `-c search_path=${schema}`, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 });
    configured = createAdminAuth({ database, secret: env.BETTER_AUTH_SECRET, baseURL });
  }
  return configured;
}
