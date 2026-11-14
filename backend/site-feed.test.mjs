import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSavedFeed } from './site-feed.mjs';

test('saved feed returns complete original source rows and import freshness', async () => {
  const raw = { ':id': 'synthetic-row', inspection_score: '05.00' };
  const store = { status: async () => ({ lastSuccess: '2026-11-14', stale: false }), latest: async () => [{ id: 'event', businessId: 'B1', inspectionDate: '2026-11-14' }], detail: async () => ({ active: true, completeEvent: true, rows: [raw], observedAt: '2026-11-13', stale: true }) };
  const feed = await loadSavedFeed(store);
  assert.deepEqual(feed.rows, [raw]);
  assert.equal(feed.oldestObservation, '2026-11-13');
  assert.equal(feed.stale, true);
});

test('saved feed does not substitute data on missing/inactive detail', async () => {
  const store = { status: async () => ({}), latest: async () => [{ id: 'event' }], detail: async () => null };
  await assert.rejects(loadSavedFeed(store), /incomplete/);
  assert.deepEqual((await loadSavedFeed({ ...store, latest: async () => [] })).rows, []);
});

test('main feed shows newest saved event per business without removing history', async () => {
  const items = [
    { id: 'old', businessId: 'B1', inspectionDate: '2024-01-31' },
    { id: 'other', businessId: 'B2', inspectionDate: '2026-11-11' },
    { id: 'new', businessId: 'B1', inspectionDate: '2026-03-31' },
  ];
  const requested = [];
  const store = { status: async () => ({}), latest: async () => items, detail: async id => { requested.push(id); return { active: true, completeEvent: true, rows: [{ ':id': id }] }; } };
  const feed = await loadSavedFeed(store);
  assert.deepEqual(requested, ['other', 'new']);
  assert.deepEqual(feed.rows.map(r => r[':id']), ['other', 'new']);
  assert.equal(items.length, 3);
});

test('saved feed batches selected events without loading detail history', async () => {
  let batches = 0;
  const store = {
    status: async () => ({ stale: false }),
    latest: async () => [{ id: 'event', businessId: 'B1', inspectionDate: '2026-11-14', rowCount: 2 }],
    feedRows: async ids => { batches++; assert.deepEqual(ids, ['event']); return [
      { event_id: 'event', raw_json: '{"violation_points":"05"}', observed_at: '2026-11-14' },
      { event_id: 'event', raw_json: '{"violation_points":"10"}', observed_at: '2026-11-14' },
    ]; },
    detail: async () => { throw Error('Full history must not be loaded'); },
  };
  const feed = await loadSavedFeed(store);
  assert.equal(feed.rows.length, 2);
  assert.equal(feed.rows[0].violation_points, '05');
  assert.equal(batches, 1);
  await assert.rejects(loadSavedFeed({ ...store, feedRows: async () => [] }), /incomplete/);
});
