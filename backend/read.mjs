export async function handleRead(store, request) {
  const url = new URL(request.url);
  const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.method !== 'GET') return reply({ error: 'Method not allowed' }, 405);
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0) return reply({ error: 'limit must be 1..100; offset must be a nonnegative integer' }, 400);
  const freshness = await store.status();
  const path = url.pathname.replace(/\/$/, '');
  if (path === '/api/refresh-status') return reply({ ...freshness, recentRuns: store.recentRuns ? await store.recentRuns() : store.db.prepare('SELECT * FROM refresh_runs ORDER BY id DESC LIMIT 20').all() });
  if (path === '/api/inspections') return reply({ items: await store.latest(limit, offset), limit, offset, freshness });
  const detail = path.match(/^\/api\/inspections\/([^/]+)$/);
  if (detail) {
    const item = await store.detail(decodeURIComponent(detail[1]));
    return item ? reply({ item, freshness }) : reply({ error: 'Inspection not imported', freshness }, 404);
  }
  const business = path.match(/^\/api\/businesses\/([^/]+)\/inspections$/);
  if (business) return reply({ ...await store.history(decodeURIComponent(business[1]), limit, offset), limit, offset, freshness });
  return reply({ error: 'Not found' }, 404);
}
