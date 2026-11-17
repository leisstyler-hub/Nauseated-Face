import {neonAdmin} from '@/lib/neon-admin';
import {getAdminAuth} from '../../backend/admin-auth.mjs';
import {GuestStore} from '../../backend/guests.mjs';
import {productionEnabled} from '../../backend/production.mjs';

export const guestsEnabled=()=>process.env.NF_GUEST_ACCOUNTS_ENABLED==='yes';
export const googleReady=()=>guestsEnabled()&&process.env.NF_GOOGLE_SIGNIN_READY==='yes'&&!!process.env.NEON_AUTH_BASE_URL;
export async function guestSession(){
 if(!guestsEnabled())return null;
 const result=await neonAdmin()?.getSession({query:{disableCookieCache:'true'}});
 return result?.data??null;
}
export function guestStore(){
 if(!guestsEnabled())throw Error('Guest accounts unavailable');
 const auth=getAdminAuth();if(!auth)throw Error('Guest database unavailable');
 return new GuestStore(auth.options.database,productionEnabled()?'nf_production':'nf_preview');
}
export const guestUnavailable=()=>Response.json({error:'Guest accounts are not available yet.'},{status:503,headers:{'Cache-Control':'private, no-store'}});
