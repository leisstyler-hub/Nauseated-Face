import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adapter } from './adapters/md-montgomery.mjs';

const native = { registration_number: '123', inspection_number: '26-10', business_name: 'Synthetic', address: '1 Example St', city: 'Silver\u00a0Spring', state: 'MD', zip: '20910', inspection_start_date: '2026-11-12T00:00:00.000', status: 'Pass', rodents_and_insects: 'Not In Compliance', proper_hand_washing: 'In Compliance', location: { type: 'Point', coordinates: [-77.02, 38.99] } };
test('Montgomery preserves official checklist wording and result without inventing scores or severity', () => {
  const row = adapter.normalize(native);
  assert.deepEqual(row[':original'], native);
  assert.equal(row.city, 'Silver Spring');
  assert.equal(row.inspection_result, 'Pass');
  assert.equal(row.violation_description, 'rodents_and_insects: Not In Compliance');
  assert.equal(row.inspection_score, undefined);
  assert.equal(row.violation_type, undefined);
  assert.equal(adapter.establishment(row).latitude, 38.99);
  assert.throws(() => adapter.normalize({ ...native, registration_number: '' }), /identity/);
  assert.throws(() => adapter.normalize({ ...native, state: 'VA' }), /identity/);
  assert.equal(adapter.normalize({ ...native, proper_hand_washing: 'Corrected Onsite' }).violation_description, 'proper_hand_washing: Corrected Onsite\nrodents_and_insects: Not In Compliance');
  assert.throws(() => adapter.normalize({ ...native, rodents_and_insects: 'Unexpected new meaning' }), /checklist/);
});
