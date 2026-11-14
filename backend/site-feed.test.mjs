import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSavedFeed } from './site-feed.mjs';

test('saved feed returns complete original source rows and import freshness', async () => {
  const raw = { ':id': 'synthetic-row', inspection_score: '05.00' };
  const store = { status: async () => ({ lastSuccess: '2026-11-14', stale: false }), latest: async () => [{ id: 'event' }], detail: async () => ({ active: true, completeEvent: true, rows: [raw], observedAt: '2026-11-13', stale: true }) };
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
