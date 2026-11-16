import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cityCenter } from './city-centers.mjs';

test('official city reference coordinates support feeds without restaurant coordinates', () => {
  const seattle = cityCenter('WA', 'Seattle');
  assert.ok(seattle.latitude > 47.5 && seattle.latitude < 47.8);
  assert.ok(seattle.longitude < -122 && seattle.longitude > -123);
  assert.equal(seattle.geoid, '5363000');
  assert.deepEqual(cityCenter('WA', 'SEATTLE'), seattle);
  assert.equal(cityCenter('TN', 'Seattle'), null);
  assert.equal(cityCenter('WA', 'Unrecognized location'), null);
});
