import { randomUUID } from 'node:crypto';

// Existing append-only audit history is also the durable switch; no separate migration.
export async function websiteEnabled(database) {
  try {
    const { rows } = await database.query("SELECT summary FROM admin_control_runs WHERE action='website-availability' AND status='success' ORDER BY started_at DESC, id DESC LIMIT 1");
    return rows[0]?.summary?.enabled !== false;
  } catch (error) {
    // No audit table means no owner has ever recorded an off action.
    if (error.code === '42P01') return true;
    throw error;
  }
}

export async function setWebsiteEnabled(database, actor, enabled) {
  await database.query("INSERT INTO admin_control_runs(id,actor_id,action,finished_at,status,summary) VALUES($1,$2,'website-availability',now(),'success',$3)", [randomUUID(), actor, JSON.stringify({ enabled })]);
  return { enabled };
}

export async function websiteRequest(request, session, apply) {
  const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (session?.user?.role !== 'owner') return reply(401, { error: 'Unauthorized' });
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply(403, { error: 'Invalid request origin' });
  if (!request.headers.get('content-type')?.startsWith('application/json') || Number(request.headers.get('content-length') ?? 0) > 1024) return reply(400, { error: 'Invalid request' });
  try {
    const body = await request.json();
    if (typeof body.enabled !== 'boolean' || typeof body.confirmed !== 'boolean' || Object.keys(body).length !== 2 || (!body.enabled && !body.confirmed)) return reply(400, { error: 'Confirm before turning the website off.' });
    return reply(200, await apply(session.user.id, body.enabled));
  } catch { return reply(503, { error: 'Could not save website availability. Check its status before retrying.' }); }
}

export function bypassMaintenance(path) {
  return ['/admin', '/api/admin', '/api/auth', '/_next'].some(prefix => path === prefix || path.startsWith(prefix + '/'))
    || ['/api/refresh', '/maintenance', '/nauseated-face.png', '/favicon.ico', '/icon.png', '/apple-icon.png'].includes(path);
}
