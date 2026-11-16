import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectionPath, readOfficialInspection } from './inspection-detail.mjs';

test('detail links preserve business, serial and inspection date identity', () => {
  assert.equal(inspectionPath({ businessId: 'A/B', serialNum: 'I 1', inspectionDate: '2026-11-14T00:00:00.000' }), '/inspections/A%2FB/I%201?date=2026-11-14T00%3A00%3A00.000');
});
test('detail reads exact inspection rows and safely quotes source filters', async () => {
  const rows = [{ business_id: "B'1", inspection_serial_num: 'I1', inspection_date: '2026-11-14', violation_description: 'Original source text' }];
  const result = await readOfficialInspection("B'1", 'I1', '2026-11-14', async url => {
    assert.match(new URL(url).searchParams.get('$where'), /business_id='B''1'/);
    return { ok: true, json: async () => rows };
  });
  assert.deepEqual(result, rows);
});
test('detail failures and unsafe partial/mismatched responses fail visibly', async () => {
  for (const response of [
    { ok: false }, { ok: true, json: async () => ({ error: true }) },
    { ok: true, json: async () => [{ business_id: 'wrong' }] },
    { ok: true, json: async () => Array(5000).fill({}) },
  ]) await assert.rejects(readOfficialInspection('B1', 'I1', 'date', async () => response));
  assert.deepEqual(await readOfficialInspection('B1', 'I1', 'date', async () => ({ ok: true, json: async () => [] })), []);
});
