import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPreviewPilot, withTransaction, prepareSnapshot } from './postgres-pilot.mjs';
import { handleRead } from './read.mjs';
import { pilotAuthorized } from './pilot-auth.mjs';
import { directPilotUrl } from './postgres-store.mjs';
import { rollbackProbe } from './pilot-run.mjs';

test('runner rollback failure still discards its client exactly once', async () => {
  const releases = [];
  const pool = { connect: async () => ({ query: async sql => { if (sql === 'ROLLBACK') throw new Error('rollback connection lost'); if (sql.includes('deliberately_missing')) throw Object.assign(new Error('probe'), { code: '42883' }); }, release: error => releases.push(error) }) };
  await assert.rejects(rollbackProbe(pool), /rollback connection lost/);
  assert.equal(releases.length, 1);
  assert.equal(releases[0]?.message, 'rollback connection lost');
});

test('pilot requires an explicit direct Neon TLS endpoint for session locks', () => {
  const direct = 'postgresql://synthetic:synthetic@ep-synthetic.us-west-2.aws.neon.tech/neondb?sslmode=require';
  assert.equal(directPilotUrl({ DATABASE_URL_UNPOOLED: direct }), direct);
  assert.throws(() => directPilotUrl({ DATABASE_URL: direct }), /direct/);
  assert.throws(() => directPilotUrl({ DATABASE_URL_UNPOOLED: direct.replace('ep-synthetic.', 'ep-synthetic-pooler.') }), /direct/);
  assert.throws(() => directPilotUrl({ DATABASE_URL_UNPOOLED: direct.replace('sslmode=require', 'sslmode=disable') }), /TLS/);
  assert.throws(() => directPilotUrl({ DATABASE_URL_UNPOOLED: `${direct}&host=ep-synthetic-pooler.us-west-2.aws.neon.tech` }), /parameters/);
  assert.throws(() => directPilotUrl({ DATABASE_URL_UNPOOLED: `${direct}&sslmode=disable` }), /parameters/);
});

test('manual pilot authorization fails closed outside verified Preview or without exact bearer', () => {
  const token = 'a'.repeat(64);
  const env = { VERCEL_ENV: 'preview', NF_PILOT_VERIFIED: 'yes', NF_PILOT_TOKEN: token };
  const request = new Request('http://localhost/api/pilot', { headers: { authorization: `Bearer ${token}` } });
  assert.equal(pilotAuthorized(request, env), true);
  assert.equal(pilotAuthorized(new Request(request.url), env), false);
  assert.equal(pilotAuthorized(request, { ...env, VERCEL_ENV: 'production' }), false);
  assert.equal(pilotAuthorized(request, { ...env, NF_PILOT_VERIFIED: undefined }), false);
  assert.equal(pilotAuthorized(request, { ...env, NF_PILOT_TOKEN: 'b'.repeat(64) }), false);
});

test('read contract awaits asynchronous repositories', async () => {
  const store = { status: async () => ({ stale: false }), latest: async () => [{ id: 'async' }], recentRuns: async () => [] };
  const body = await (await handleRead(store, new Request('http://localhost/api/inspections'))).json();
  assert.deepEqual(body.items, [{ id: 'async' }]);
  assert.equal(body.freshness.stale, false);
});

test('pilot guard rejects production and unverified remote targets', () => {
  assert.throws(() => assertPreviewPilot({ VERCEL_ENV: 'production', NF_PILOT_VERIFIED: 'yes' }), /production/);
  assert.throws(() => assertPreviewPilot({ VERCEL_ENV: 'preview' }), /verified/);
  assert.doesNotThrow(() => assertPreviewPilot({ VERCEL_ENV: 'preview', NF_PILOT_VERIFIED: 'yes' }));
});

test('transaction failures roll back and release the connection', async () => {
  const calls = [];
  const client = { query: async sql => { calls.push(sql); }, release: () => calls.push('release') };
  await assert.rejects(withTransaction({ connect: async () => client }, async () => { throw new Error('synthetic promotion failure'); }), /promotion failure/);
  assert.deepEqual(calls, ['BEGIN', 'ROLLBACK', 'release']);
});

test('commit failure attempts rollback and still releases', async () => {
  const calls = [];
  const client = { query: async sql => { calls.push(sql); if (sql === 'COMMIT') throw new Error('lost commit acknowledgement'); }, release: () => calls.push('release') };
  await assert.rejects(withTransaction({ connect: async () => client }, async () => 1), /acknowledgement/);
  assert.deepEqual(calls, ['BEGIN', 'COMMIT', 'ROLLBACK', 'release']);
});

test('failed rollback discards the damaged pooled connection', async () => {
  let discarded;
  const client = { query: async sql => { if (sql === 'ROLLBACK') throw new Error('connection lost'); }, release: error => { discarded = error; } };
  await assert.rejects(withTransaction({ connect: async () => client }, async () => { throw new Error('promotion failed'); }), /promotion failed/);
  assert.equal(discarded?.message, 'connection lost');
});

const row = (id, overrides = {}) => ({ ':id': id, business_id: 'SYNTHETIC-B', inspection_serial_num: 'SYNTHETIC-I', inspection_date: '2026-01-01', inspection_score: '05.00', violation_points: '05', ...overrides });
const snap = rows => ({ rows, scope: { type: 'all' }, revision: 'synthetic', urls: [] });

test('preparation preserves original strings and rejects conflicting or duplicate rows', () => {
  const result = prepareSnapshot(snap([row('r1'), row('r2')]));
  assert.equal(result.rows.length, 2);
  assert.equal(JSON.parse(result.rows[0].raw).inspection_score, '05.00');
  assert.equal(JSON.parse(result.rows[0].raw).violation_points, '05');
  assert.throws(() => prepareSnapshot(snap([row('r1'), row('r1')])), /Duplicate/);
  assert.throws(() => prepareSnapshot(snap([row('r1'), row('r2', { inspection_score: '10.00' })])), /Conflicting/);
});

test('preparation rejects unknown scope, missing keys and out-of-scope business', () => {
  assert.throws(() => prepareSnapshot({ ...snap([]), scope: { type: 'unknown' } }), /scope/);
  assert.throws(() => prepareSnapshot(snap([row('r1', { business_id: '' })])), /keys/);
  assert.throws(() => prepareSnapshot({ ...snap([row('r1')]), scope: { type: 'business', businessId: 'OTHER' } }), /outside/);
});
