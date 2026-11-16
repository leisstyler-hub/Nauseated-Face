import { getAdminAuth, ownerSession } from '../../../../../backend/admin-auth.mjs';
import { accessRequest, inviteAdministrator } from '../../../../../backend/admin-neon.mjs';

export async function POST(request) {
  const auth = getAdminAuth();
  const session = await ownerSession(auth, request.headers);
  return accessRequest(request, session, async values => {
    if (!process.env.NEON_AUTH_BASE_URL) return { status: 503, body: { error: 'Neon invitations are not configured yet.' } };
    return inviteAdministrator({ ...values, database: auth.options.database, origin: new URL(request.url).origin, baseURL: process.env.NEON_AUTH_BASE_URL });
  });
}
