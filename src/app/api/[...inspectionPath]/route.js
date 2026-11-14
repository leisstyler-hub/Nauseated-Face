import { connection } from 'next/server';
import { openStore, handleRead } from '../../../../backend/index.mjs';
import { openPostgres } from '../../../../backend/postgres-store.mjs';

export async function GET(request) {
  await connection();
  let store;
  try {
    store = process.env.VERCEL_ENV === 'preview' && process.env.NF_PILOT_VERIFIED === 'yes' ? openPostgres() : openStore();
    return await handleRead(store, request);
  } catch {
    return Response.json({ error: 'Inspection storage unavailable', freshness: { lastSuccess: null, stale: true } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  } finally {
    await store?.close();
  }
}
