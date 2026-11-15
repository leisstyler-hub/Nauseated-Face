import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { CONTROL_SCHEMA } from './admin-controls.mjs';
import { websiteEnabled, setWebsiteEnabled, websiteRequest, bypassMaintenance } from './website-availability.mjs';
import { websiteProxy } from './website-proxy.mjs';
import { NextRequest } from 'next/server.js';

test('website defaults on, persists off and on, and audits each actor without touching inspection data', async () => {
  const db = new PGlite();
  try {
    await db.exec(CONTROL_SCHEMA);
    assert.equal(await websiteEnabled(db), true);
    await setWebsiteEnabled(db, 'owner-one', false);
    assert.equal(await websiteEnabled(db), false);
    await setWebsiteEnabled(db, 'owner-two', true);
    assert.equal(await websiteEnabled(db), true);
    const rows = (await db.query("SELECT actor_id,summary FROM admin_control_runs ORDER BY started_at")).rows;
    assert.deepEqual(rows.map(r => [r.actor_id, r.summary.enabled]), [['owner-one', false], ['owner-two', true]]);
  } finally { await db.close(); }
});

test('an environment without the audit table defaults on until additive setup, but other storage failures surface', async () => {
  const db = new PGlite();
  try { assert.equal(await websiteEnabled(db), true); } finally { await db.close(); }
  await assert.rejects(websiteEnabled({ query: async () => { throw Object.assign(new Error('offline'), { code: '08006' }); } }), /offline/);
});

test('website writes require owner, same origin, valid boolean and explicit off confirmation', async () => {
  let calls = 0;
  const apply = async () => { calls++; return { enabled: false }; };
  const owner = { user: { id: 'o', role: 'owner' } };
  const request = (body, origin = 'https://site.test') => new Request('https://site.test/api/admin/website', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const valid = { enabled: false, confirmed: true };
  assert.equal((await websiteRequest(request(valid), null, apply)).status, 401);
  assert.equal((await websiteRequest(request(valid), { user: { role: 'viewer' } }, apply)).status, 401);
  assert.equal((await websiteRequest(request(valid, 'https://other.test'), owner, apply)).status, 403);
  for (const body of [{ enabled: false }, { enabled: false, confirmed: false }, { enabled: 'false', confirmed: true }, { ...valid, extra: true }]) {
    assert.equal((await websiteRequest(request(body), owner, apply)).status, 400);
  }
  assert.equal(calls, 0);
  assert.equal((await websiteRequest(request(valid), owner, apply)).status, 200);
  assert.equal(calls, 1);
  assert.equal((await websiteRequest(request(valid), owner, async () => { throw Error('secret'); })).status, 503);
});

test('maintenance leaves recovery, auth, cron and assets accessible but covers public pages and APIs', () => {
  for (const path of ['/admin', '/admin/controls', '/api/admin/website', '/api/auth/get-session', '/api/refresh', '/maintenance', '/_next/static/main.js', '/nauseated-face.png', '/favicon.ico']) assert.equal(bypassMaintenance(path), true, path);
  for (const path of ['/', '/search', '/locations', '/wa/seattle', '/api/search', '/api/inspections', '/administrator', '/api/administer', '/search.json']) assert.equal(bypassMaintenance(path), false, path);
});

test('off returns uncached 503 pages and APIs, restoration passes through, and recovery skips state reads', async () => {
  const request = path => new NextRequest('https://site.test' + path, { headers: { 'x-nf-maintenance': 'spoofed' } });
  const page = await websiteProxy(request('/search?q=private'), async () => false);
  assert.equal(page.status, 503);
  assert.equal(page.headers.get('x-middleware-rewrite'), 'https://site.test/maintenance');
  assert.match(page.headers.get('cache-control'), /no-store/);
  assert.equal(page.headers.get('retry-after'), '300');
  assert.equal(page.headers.get('x-middleware-request-x-nf-maintenance'), '1');
  const api = await websiteProxy(request('/api/search'), async () => false);
  assert.equal(api.status, 503);
  assert.match((await api.json()).error, /temporarily offline/);
  const restored = await websiteProxy(request('/search'), async () => true);
  assert.equal(restored.headers.get('x-middleware-next'), '1');
  assert.equal(restored.headers.get('x-middleware-request-x-nf-maintenance'), null);
  for (const path of ['/admin/login', '/admin/controls', '/api/admin/website', '/api/auth/sign-in/email']) {
    const result = await websiteProxy(request(path), async () => { assert.fail('Recovery must not depend on state storage'); });
    assert.equal(result.headers.get('x-middleware-next'), '1');
  }
  assert.equal((await websiteProxy(request('/'), async () => { throw Error('database unavailable'); })).status, 503);
});
