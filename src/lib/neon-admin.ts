import { createNeonAuth } from '@neon/auth/next/server';

let configured: ReturnType<typeof createNeonAuth> | undefined;
export function neonAdmin() {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.BETTER_AUTH_SECRET) return null;
  return configured ??= createNeonAuth({ baseUrl: process.env.NEON_AUTH_BASE_URL, cookies: { secret: process.env.BETTER_AUTH_SECRET, sessionDataTtl: 60 }, logLevel: 'silent' });
}
