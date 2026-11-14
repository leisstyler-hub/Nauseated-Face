import { timingSafeEqual } from 'node:crypto';

export function pilotAuthorized(request, env = process.env) {
  if (env.VERCEL_ENV !== 'preview' || env.NF_PILOT_VERIFIED !== 'yes' || !env.NF_PILOT_TOKEN || env.NF_PILOT_TOKEN.length < 32) return false;
  const supplied = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${env.NF_PILOT_TOKEN}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
