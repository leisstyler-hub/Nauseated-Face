import { connection } from 'next/server';
import { openStore, handleRead } from '../../../../backend/index.mjs';
import { openSiteStore, savedStorageEnabled } from '../../../../backend/production.mjs';

export async function GET(request) {
  await connection();
  let store;
  try {
    store = savedStorageEnabled() ? openSiteStore() : openStore();
    return await handleRead(store, request);
  } catch {
    return Response.json({ error: 'Inspection storage unavailable', freshness: { lastSuccess: null, stale: true } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  } finally {
    await store?.close();
  }
}
