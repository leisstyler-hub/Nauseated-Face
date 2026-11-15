import { revalidateTag } from 'next/cache';
import { openSiteStore, refreshAuthorized, runProductionRefresh } from '../../../../backend/production.mjs';

export const maxDuration = 300;

async function refresh(request) {
  if (!refreshAuthorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  let store;
  try {
    store = openSiteStore();
    const result = await runProductionRefresh(store);
    revalidateTag('inspection-desk', { expire: 0 });
    return Response.json({ result, coverage: 'Latest complete inspection events per enabled jurisdiction; retained earlier imports. Not full coverage of any jurisdiction.' }, { status: result.failures?.length ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const busy = error.message === 'Another preview importer is active';
    return Response.json({ error: busy ? 'A refresh is already running' : 'Refresh failed; last committed snapshot retained' }, { status: busy ? 409 : 503, headers: { 'Cache-Control': 'no-store' } });
  } finally { await store?.close(); }
}

export const GET = refresh;
export const POST = refresh;
