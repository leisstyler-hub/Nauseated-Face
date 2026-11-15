import { getAdminAuth, ownerSession } from '../../../../../backend/admin-auth.mjs';
import { openSiteStore } from '../../../../../backend/production.mjs';

export async function GET(request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    if (!await ownerSession(getAdminAuth(), request.headers)) return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
    const store = openSiteStore();
    try { return Response.json(await store.operations(), { headers }); } finally { await store.close(); }
  } catch { return Response.json({ error: 'Operations temporarily unavailable' }, { status: 503, headers }); }
}
