import { NextResponse } from 'next/server.js';
import { bypassMaintenance } from './website-availability.mjs';

export async function websiteProxy(request, readEnabled) {
  const path = request.nextUrl.pathname;
  const headers = new Headers(request.headers);
  // Never trust a caller-supplied shell override.
  headers.delete('x-nf-maintenance');
  if (path === '/maintenance') headers.set('x-nf-maintenance', '1');
  if (bypassMaintenance(path)) return NextResponse.next({ request: { headers } });
  let enabled;
  try { enabled = await readEnabled(); } catch (error) {
    console.error('Website availability read failed', { name: error?.name, code: error?.code });
    enabled = false;
  }
  if (enabled) return NextResponse.next({ request: { headers } });
  const responseHeaders = { 'Cache-Control': 'no-store, max-age=0', 'Retry-After': '300' };
  if (path.startsWith('/api/')) return NextResponse.json({ error: 'Nauseated Face is temporarily offline. Please try again soon.' }, { status: 503, headers: responseHeaders });
  headers.set('x-nf-maintenance', '1');
  return NextResponse.rewrite(new URL('/maintenance', request.url), { status: 503, request: { headers }, headers: responseHeaders });
}
