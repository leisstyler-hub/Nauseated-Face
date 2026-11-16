import { getAdminAuth, ownerSession } from '../../../../../backend/admin-auth.mjs';
export async function GET(request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const session = await ownerSession(getAdminAuth(), request.headers);
    return Response.json({ authorized: !!session }, { status: session ? 200 : 401, headers });
  } catch { return Response.json({ authorized: false }, { status: 503, headers }); }
}
