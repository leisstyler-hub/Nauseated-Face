import { getAdminAuth, ownerSession } from '../../../../../backend/admin-auth.mjs';
import { controlRequest, runAdminRefresh } from '../../../../../backend/admin-controls.mjs';
import { openSiteStore, runProductionRefresh } from '../../../../../backend/production.mjs';

export const maxDuration = 300;
export async function POST(request) {
  try {
    const auth = getAdminAuth();
    const session = await ownerSession(auth, request.headers);
    return controlRequest(request, session, actor => runAdminRefresh(auth.options.database, actor, async () => {
      const store = openSiteStore();
      try { return await runProductionRefresh(store); } finally { await store.close(); }
    }));
  } catch { return Response.json({ error: 'Controls temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
