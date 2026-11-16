import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatInspectionDate } from '../src/lib/format.ts';

test('county calendar dates never shift across runtime timezones', () => {
  for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
    const previous = process.env.TZ;
    process.env.TZ = tz;
    try {
      assert.equal(formatInspectionDate('2026-11-12T00:00:00.000'), 'Nov 12, 2026');
      assert.equal(formatInspectionDate('2026-11-12'), 'Nov 12, 2026');
      assert.equal(formatInspectionDate('2026-11-12T00:00:00Z'), 'Nov 11, 2026');
      assert.equal(formatInspectionDate('not a date'), 'not a date');
    } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
  }
});
