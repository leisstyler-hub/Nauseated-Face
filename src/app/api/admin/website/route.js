import { revalidatePath } from 'next/cache';
import { getAdminAuth, ownerSession } from '../../../../../backend/admin-auth.mjs';
import { setWebsiteEnabled, websiteRequest } from '../../../../../backend/website-availability.mjs';

export async function POST(request) {
  try {
    const auth = getAdminAuth();
    const session = await ownerSession(auth, request.headers);
    return websiteRequest(request, session, async (actor, enabled) => {
      const result = await setWebsiteEnabled(auth.options.database, actor, enabled);
      revalidatePath('/', 'layout');
      return result;
    });
  } catch { return Response.json({ error: 'Website control temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
