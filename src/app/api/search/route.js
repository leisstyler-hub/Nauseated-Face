import { openSiteStore, savedStorageEnabled } from '../../../../backend/production.mjs';
import { JURISDICTIONS, stateSlug } from '../../../../backend/jurisdictions.mjs';

const STATE_SLUGS = Object.fromEntries(JURISDICTIONS.map(j => [j.stateCode, stateSlug(j.stateName)]));

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get('q') ?? '').slice(0, 120);
  const state = params.get('state')?.slice(0, 2);
  const city = params.get('city')?.slice(0, 80);
  const limit = Math.min(25, Math.max(1, Math.floor(Number(params.get('limit'))) || 10));
  if (q.trim().length < 2) return Response.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } });
  if (!savedStorageEnabled()) return Response.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } });
  const store = openSiteStore();
  try {
    const rows = await store.searchEstablishments({ q, stateCode: state ?? undefined, city: city ?? undefined, limit });
    return Response.json({
      results: rows.map(r => ({
        name: r.name, address: r.address, city: r.city, stateCode: r.stateCode,
        stateSlug: STATE_SLUGS[r.stateCode] ?? stateSlug(r.stateCode), zip: r.zip, slug: r.slug,
        latestInspectionDate: r.latestInspectionDate, latestResult: r.latestResult,
        latestScore: r.latestScore, inspectionCount: r.inspectionCount, jurisdictionId: r.jurisdictionId,
      })),
    }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300' } });
  } catch {
    return Response.json({ error: 'Search temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  } finally {
    await store.close();
  }
}
