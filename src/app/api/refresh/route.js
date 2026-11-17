import { revalidateTag } from 'next/cache';
import { openSiteStore, refreshAuthorized, runProductionRefresh } from '../../../../backend/production.mjs';
import {ADAPTERS} from '../../../../backend/adapters/index.mjs';

export const maxDuration = 300;

async function refresh(request) {
  if (!refreshAuthorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const jurisdictionId=new URL(request.url).searchParams.get('jurisdiction')??undefined;
  if(jurisdictionId&&!ADAPTERS[jurisdictionId])return Response.json({error:'Unknown jurisdiction'},{status:400});
  let store;
  try {
    store = openSiteStore();
    const schedule=request.headers.get('x-vercel-cron-schedule');
    const trigger=request.method==='GET'&&request.headers.get('user-agent')==='vercel-cron/1.0'&&schedule?'vercel-cron':'operator';
    const result = await runProductionRefresh(store,undefined,{jurisdictionId,trigger,schedule});
    revalidateTag('inspection-desk', { expire: 0 });
    return Response.json({ result, coverage: result.coverage }, { status: result.failures?.length ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const busy = error.message === 'Another preview importer is active';
    return Response.json({ error: busy ? 'A refresh is already running' : 'Refresh failed; last committed snapshot retained' }, { status: busy ? 409 : 503, headers: { 'Cache-Control': 'no-store' } });
  } finally { await store?.close(); }
}

export const GET = refresh;
export const POST = refresh;
