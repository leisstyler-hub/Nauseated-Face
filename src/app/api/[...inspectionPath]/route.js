import { connection } from 'next/server';
import { openStore, handleRead } from '../../../../backend/index.mjs';

export async function GET(request) {
  await connection();
  let store;
  try {
    store = openStore();
    return await handleRead(store, request);
  } catch {
    return Response.json({ error: 'Inspection storage unavailable', freshness: { lastSuccess: null, stale: true } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  } finally {
    store?.close();
  }
}
