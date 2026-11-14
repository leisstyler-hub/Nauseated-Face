// Explicit integration check against the official service; never used by read endpoints.
import assert from 'node:assert/strict';
import { Source, eventId } from './index.mjs';
const base = process.env.NF_VERIFY_BASE || 'http://localhost:3101';
const get = async path => {
  const r = await fetch(base + path);
  assert.equal(r.status, 200, path);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  return r.json();
};
const canonical = rows => rows.map(r => JSON.stringify(Object.fromEntries(Object.entries(r).sort(([a], [b]) => a.localeCompare(b))))).sort();
const latest = await get('/api/inspections?limit=5');
assert.equal(latest.items.length, 5);
const checks = [];
for (const item of latest.items) {
  const detail = await get(`/api/inspections/${item.id}`);
  const url = new URL(item.sourceUrl);
  url.searchParams.set('$select', '*, :id');
  url.searchParams.set('$order', ':id');
  url.searchParams.set('$limit', '50000');
  const official = await (await fetch(url)).json();
  assert.deepEqual(canonical(detail.item.rows), canonical(official));
  checks.push({ id: item.id, businessId: item.businessId, serial: item.serial, officialRowCount: official.length, storedRowCount: detail.item.rows.length, exactRawMatch: true, sourceUrl: url.toString() });
}
const businessId = 'PFE-PR-3147569';
const officialHistory = await new Source({ pageSize: 2 }).snapshot({ type: 'business', businessId });
const history = await get(`/api/businesses/${businessId}/inspections?limit=100`);
assert.equal(history.complete, true);
const ids = [...new Set(officialHistory.rows.map(r => eventId(r.business_id, r.inspection_serial_num)))].sort();
assert.deepEqual(history.items.map(r => r.id).sort(), ids);
for (const item of history.items) {
  const d = await get(`/api/inspections/${item.id}`);
  assert.deepEqual(canonical(d.item.rows), canonical(officialHistory.rows.filter(r => eventId(r.business_id, r.inspection_serial_num) === item.id)));
}
const status = await get('/api/refresh-status');
assert.ok(status.lastSuccess);
const missing = await fetch(base + '/api/inspections/missing');
assert.equal(missing.status, 404);
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), base, checks, businessHistory: { businessId, inspections: ids.length, sourceRows: officialHistory.rows.length, exactRawMatch: true, pageSize: 2 }, lastSuccess: status.lastSuccess, sourceRevision: status.sourceRevision, fullImportRun: Boolean(status.lastFullImport), recentRuns: status.recentRuns.map(r => ({ id: r.id, status: r.status, rows: r.row_count, changed: r.changed_count })) }, null, 2));
