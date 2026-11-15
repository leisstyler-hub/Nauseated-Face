import { revalidatePath, revalidateTag } from 'next/cache';
import { getAdminAuth, ownerSession } from '../../../../../backend/admin-auth.mjs';
import { jurisdictionRequest, applyAvailabilityChange } from '../../../../../backend/admin-controls.mjs';
import { openSiteStore } from '../../../../../backend/production.mjs';

export async function POST(request) {
  try {
    const auth = getAdminAuth();
    const session = await ownerSession(auth, request.headers);
    return await jurisdictionRequest(request, session, async (actor, jurisdictionId, enabled) => {
      const store = openSiteStore();
      let result;
      try {
        result = await applyAvailabilityChange({
          adminDatabase: auth.options.database,
          setEnabled: (id, value) => store.setJurisdictionEnabled(id, value),
          actor, jurisdictionId, enabled,
        });
      } finally { await store.close(); }
      // Public geography and record feeds read `enabled` on each request; purge cached routes so a
      // disabled city drops from the live site (and a re-enabled one returns) immediately.
      if (result.status === 200) { revalidateTag('inspection-desk', { expire: 0 }); revalidatePath('/', 'layout'); }
      return result;
    });
  } catch { return Response.json({ error: 'Availability control temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
