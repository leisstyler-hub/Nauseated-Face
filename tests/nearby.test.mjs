import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearbyCities } from '../src/lib/nearby.ts';
import { cityCenter } from '../backend/city-centers.mjs';

test('Seattle remains discoverable when its inspection feed lacks restaurant coordinates', () => {
  const reference = cityCenter('WA', 'Seattle');
  const city = { name: 'Seattle', covered: true, ...reference };
  assert.equal(nearbyCities(47.61, -122.33, [city])[0].name, 'Seattle');
  assert.deepEqual(nearbyCities(47.61, -122.33, [{ ...city, covered: false }]), []);
});

test('nearby suggestions require published records and valid coordinates, and stay within 50 miles', () => {
  const cities = [
    { name: 'Seattle', covered: true, latitude: 47.61, longitude: -122.33 },
    { name: 'Unavailable', covered: false, latitude: 47.60, longitude: -122.33 },
    { name: 'Chicago', covered: true, latitude: 41.88, longitude: -87.63 },
    { name: 'Missing', covered: true, latitude: null, longitude: null },
  ];
  assert.deepEqual(nearbyCities(47.60, -122.33, cities).map(c => c.name), ['Seattle']);
  assert.deepEqual(nearbyCities(36.16, -86.78, cities), []);
  assert.deepEqual(nearbyCities(NaN, -122, cities), []);
  assert.deepEqual(nearbyCities(91, -122, cities), []);
});
