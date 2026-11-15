import { randomUUID } from 'node:crypto';

export const CONTROL_SCHEMA = `CREATE TABLE IF NOT EXISTS admin_control_runs (
  id text PRIMARY KEY, actor_id text NOT NULL, action text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  status text NOT NULL, summary jsonb
); CREATE INDEX IF NOT EXISTS admin_control_runs_started ON admin_control_runs(started_at DESC);`;
const LOCK = 91382334;

export async function runAdminRefresh(database, actor, refresh) {
  const client = await database.connect();
  let locked = false, id, damaged;
  try {
    locked = (await client.query('SELECT pg_try_advisory_lock($1) AS locked', [LOCK])).rows[0].locked;
    if (!locked) return { status: 409, body: { error: 'An administrator refresh is already running.' } };
    const recent = await client.query("SELECT id FROM admin_control_runs WHERE started_at > now()-interval '60 seconds' LIMIT 1");
    if (recent.rows.length) return { status: 429, body: { error: 'Please wait a minute before another refresh.' } };
    id = randomUUID();
    await client.query("INSERT INTO admin_control_runs(id,actor_id,action,status) VALUES($1,$2,'refresh','running')", [id, actor]);
    const result = await refresh();
    const partial = !!result.failures?.length;
    await client.query('UPDATE admin_control_runs SET finished_at=now(),status=$1,summary=$2 WHERE id=$3', [partial ? 'partial' : 'success', JSON.stringify(result), id]);
    return { status: 200, body: { runId: id, ...result } };
  } catch {
    if (id) await client.query("UPDATE admin_control_runs SET finished_at=now(),status='error',summary=$1 WHERE id=$2", [JSON.stringify({ error: 'Refresh failed; previous committed records retained.' }), id]).catch(() => {});
    return { status: 503, body: { error: 'Refresh failed; previous committed records retained.' } };
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock($1)', [LOCK]).catch(error => { damaged = error; });
    client.release(damaged);
  }
}

export async function controlRequest(request, session, run) {
  const headers = { 'Cache-Control': 'no-store' };
  const reply = (status, body) => Response.json(body, { status, headers });
  if (session?.user?.role !== 'owner') return reply(401, { error: 'Unauthorized' });
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply(403, { error: 'Invalid request origin' });
  if (!request.headers.get('content-type')?.startsWith('application/json') || Number(request.headers.get('content-length') ?? 0) > 1024) return reply(400, { error: 'Invalid request' });
  try {
    const body = await request.json();
    if (body.action !== 'refresh' || Object.keys(body).length !== 1) return reply(400, { error: 'Unknown action' });
    const result = await run(session.user.id);
    return reply(result.status, result.body);
  } catch { return reply(503, { error: 'Control temporarily unavailable' }); }
}
