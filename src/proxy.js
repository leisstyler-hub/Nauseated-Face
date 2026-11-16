import { getAdminAuth } from '../backend/admin-auth.mjs';
import { websiteEnabled } from '../backend/website-availability.mjs';
import { websiteProxy } from '../backend/website-proxy.mjs';

export async function proxy(request) {
  return websiteProxy(request, async () => {
    const auth = getAdminAuth();
    return auth ? websiteEnabled(auth.options.database) : true;
  });
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
