import { neonAdmin } from '@/lib/neon-admin';
import { getAdminAuth } from '../../../../../../backend/admin-auth.mjs';
import { recoverAdministrator } from '../../../../../../backend/admin-neon.mjs';

const allowed = new Set(['sign-in/email', 'sign-out', 'get-session', 'request-password-reset', 'reset-password', 'send-verification-email', 'verify-email']);
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (!allowed.has(path.join('/'))) return Response.json({ error: 'Not available' }, { status: 404 });
  if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  const auth = neonAdmin();
  if (!auth) return Response.json({ error: 'Neon authentication unavailable' }, { status: 503 });
  if (request.method === 'POST' && path.join('/') === 'request-password-reset') {
    try {
      const raw = await request.text(); if (raw.length > 2048) return Response.json({ error: 'Invalid request' }, { status: 400 });
      const body = JSON.parse(raw);
      if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return Response.json({ error: 'Invalid email' }, { status: 400 });
      const local = getAdminAuth(); if (!local) throw Error('Not configured');
      const result = await recoverAdministrator({ database: local.options.database, email: body.email.trim().toLowerCase(), ip: request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'unknown', origin: new URL(request.url).origin, baseURL: process.env.NEON_AUTH_BASE_URL });
      return Response.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
    } catch { return Response.json({ error: 'Recovery temporarily unavailable' }, { status: 503 }); }
  }
  const handler = auth.handler();
  return request.method === 'GET' ? handler.GET(request, context) : handler.POST(request, context);
}
export const GET = handle;
export const POST = handle;
