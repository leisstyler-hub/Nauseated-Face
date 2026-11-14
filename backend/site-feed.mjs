// Read only: rendering never collects source data or starts an import.
export async function loadSavedFeed(store, limit = 100) {
  const freshness = await store.status();
  const items = await store.latest(limit, 0);
  const rows = [];
  const observed = [];
  let stale = Boolean(freshness.stale);
  const businesses = new Set();
  const newestFirst = [...items].sort((a, b) => (b.inspectionDate ?? '').localeCompare(a.inspectionDate ?? '') || a.id.localeCompare(b.id));
  for (const item of newestFirst) {
    if (businesses.has(item.businessId ?? item.id)) continue;
    businesses.add(item.businessId ?? item.id);
    const detail = await store.detail(item.id);
    if (!detail?.active || !detail.completeEvent || !detail.rows.length) throw new Error('Saved inspection feed is incomplete');
    rows.push(...detail.rows);
    if (detail.observedAt) observed.push(detail.observedAt);
    stale ||= Boolean(detail.stale);
  }
  return { rows, freshness, stale, oldestObservation: observed.sort()[0] ?? null };
}
