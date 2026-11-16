import { getAdminAuth } from '../backend/admin-auth.mjs';
import { websiteEnabled } from '../backend/website-availability.mjs';
import { websiteProxy } from '../backend/website-proxy.mjs';
import {neonAdmin} from './lib/neon-admin';
import {guestsEnabled} from './lib/guests';

export async function proxy(request) {
  const response=await websiteProxy(request, async () => {
    const auth = getAdminAuth();
    return auth ? websiteEnabled(auth.options.database) : true;
  });
  if(response.status===200&&request.nextUrl.pathname==='/account/callback'&&guestsEnabled()){
    const auth=neonAdmin();
    if(auth)return auth.middleware({loginUrl:'/sign-in',publicRoutes:['/account/callback']})(request);
  }
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
