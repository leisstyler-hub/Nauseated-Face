// Read only: rendering never collects source data or starts an import.
export async function loadSavedFeed(store, limit = 100) {
  const [freshness, items] = await Promise.all([store.status(), store.latest(limit, 0)]);
  const rows = [];
  const observed = [];
  let stale = Boolean(freshness.stale);
  const businesses = new Set();
  const newestFirst = [...items].sort((a, b) => (b.inspectionDate ?? '').localeCompare(a.inspectionDate ?? '') || a.id.localeCompare(b.id));
  const selected = newestFirst.filter(item => {
    const key = item.businessId ?? item.id;
    if (businesses.has(key)) return false;
    businesses.add(key);
    return true;
  });
  if (store.feedRows) {
    const batch = await store.feedRows(selected.map(item => item.id));
    const grouped = new Map();
    for (const row of batch) {
      const group = grouped.get(row.event_id) ?? [];
      group.push(row);
      grouped.set(row.event_id, group);
    }
    for (const item of selected) {
      const group = grouped.get(item.id);
      if (!group?.length || group.length !== item.rowCount) throw new Error('Saved inspection feed is incomplete');
      for (const row of group) {
        rows.push(JSON.parse(row.raw_json));
        if (row.observed_at) observed.push(row.observed_at);
        stale ||= !row.observed_at || Date.now() - Date.parse(row.observed_at) > 86400000;
      }
    }
    return { rows, freshness, stale, oldestObservation: observed.sort()[0] ?? null };
  }
  for (const item of selected) {
    const detail = await store.detail(item.id);
    if (!detail?.active || !detail.completeEvent || !detail.rows.length) throw new Error('Saved inspection feed is incomplete');
    rows.push(...detail.rows);
    if (detail.observedAt) observed.push(detail.observedAt);
    stale ||= Boolean(detail.stale);
  }
  return { rows, freshness, stale, oldestObservation: observed.sort()[0] ?? null };
}
