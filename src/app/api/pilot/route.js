import { openPostgres } from '../../../../backend/postgres-store.mjs';
import { pilotAuthorized } from '../../../../backend/pilot-auth.mjs';
import { runNationalPilot } from '../../../../backend/national-pilot.mjs';
import { runPilot } from '../../../../backend/pilot-run.mjs';

export const maxDuration = 300;

export async function POST(request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!pilotAuthorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
  let store;
  try {
    store = openPostgres();
    return Response.json({ revision: process.env.VERCEL_GIT_COMMIT_SHA ?? null, deployment: process.env.VERCEL_URL, result: await (new URL(request.url).searchParams.get('suite') === 'national' ? runNationalPilot(store) : runPilot(store)) }, { headers });
  } catch {
    return Response.json({ error: 'Preview pilot failed; inspect sanitized database status before retrying' }, { status: 503, headers });
  } finally { await store?.close(); }
}
