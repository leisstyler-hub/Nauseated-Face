import { getAdminAuth } from '../../../../../backend/admin-auth.mjs';

async function handle(request) {
  const auth = getAdminAuth();
  if (!auth) return Response.json({ error: 'Administrator sign-in is not configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  return auth.handler(request);
}
export const GET = handle;
export const POST = handle;
