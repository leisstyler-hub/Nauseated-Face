import { createHash } from 'node:crypto';

const canonical = value => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
const digest = value => createHash('sha256').update(value).digest('hex');

// Operator assertion supplements resource verification; it cannot prove isolation.
export function assertPreviewPilot(env = process.env) {
  if (env.VERCEL_ENV === 'production') throw new Error('Pilot cannot run in production');
  if (env.VERCEL_ENV !== 'preview') throw new Error('Pilot requires Preview runtime');
  if (env.NF_PILOT_VERIFIED !== 'yes') throw new Error('Pilot resource and Preview isolation must be verified before SQL');
}

export async function withTransaction(pool, action) {
  const client = await pool.connect();
  let begun = false;
  let discard;
  try {
    await client.query('BEGIN');
    begun = true;
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (begun) {
      try { await client.query('ROLLBACK'); }
      catch (rollbackError) { discard = rollbackError; }
    }
    throw error;
  } finally {
    client.release(discard);
  }
}

export function prepareSnapshot(snapshot, jurisdiction = 'wa-king') {
  if (!snapshot || !Array.isArray(snapshot.rows) || !['all', 'latest', 'business','window'].includes(snapshot.scope?.type)) throw new Error('Invalid snapshot scope/rows');
  if(snapshot.scope.type==='window'&&(![snapshot.scope.start,snapshot.scope.end].every(v=>/^\d{4}-\d{2}-\d{2}$/.test(v??''))||snapshot.scope.start>=snapshot.scope.end))throw Error('Invalid snapshot date window');
  if (snapshot.scope.type === 'business' && !snapshot.scope.businessId) throw new Error('Business scope requires businessId');
  if (snapshot.scope.type === 'latest' && (!Number.isInteger(snapshot.scope.limit) || snapshot.scope.limit < 1 || snapshot.scope.limit > 100)) throw new Error('Latest scope requires bounded limit');
  const quarantine = snapshot.quarantine ?? [];
  if (!Array.isArray(quarantine) || (quarantine.length && !['all','window'].includes(snapshot.scope.type)) ||
      quarantine.some(r => !r || typeof r.sourceId !== 'string' || !r.sourceId || !r.raw || typeof r.reason !== 'string' || !r.reason)) throw new Error('Invalid quarantined source rows');
  const sourceRowCount = snapshot.sourceRowCount ?? snapshot.rows.length;
  if (!Number.isSafeInteger(sourceRowCount) || sourceRowCount !== snapshot.rows.length + quarantine.length) throw new Error('Source row accounting mismatch');
  const seen = new Set();
  const events = new Map();
  const rows = snapshot.rows.map(row => {
    if (!row || [':id', 'business_id', 'inspection_serial_num', 'inspection_date'].some(key => typeof row[key] !== 'string' || !row[key])) throw new Error('Source row missing stable keys/date');
    if (seen.has(row[':id'])) throw new Error('Duplicate source row during pagination');
    seen.add(row[':id']);
    if (snapshot.scope.type === 'business' && row.business_id !== snapshot.scope.businessId) throw new Error('Source row outside requested business');
    if(snapshot.scope.type==='window'&&!(row.inspection_date>=snapshot.scope.start&&row.inspection_date<snapshot.scope.end))throw Error('Source row outside requested date window');
    const id = digest(JSON.stringify(jurisdiction === 'wa-king' ? [row.business_id, row.inspection_serial_num] : [jurisdiction, row.business_id, row.inspection_serial_num]));
    const fields = canonical(Object.fromEntries(Object.entries(row).filter(([key]) => !key.startsWith(':') && !key.startsWith('violation_'))));
    if (events.has(id) && events.get(id).fields !== fields) throw new Error('Conflicting inspection fields; refusing lossy grouping');
    events.set(id, { fields, businessId: row.business_id, serial: row.inspection_serial_num, date: row.inspection_date });
    const raw = canonical(row);
    return { sourceId: jurisdiction === 'wa-king' ? row[':id'] : `${jurisdiction}:${row[':id']}`, id, raw, hash: digest(raw) };
  });
  const protectedSourceIds = new Set(quarantine.map(r => jurisdiction === 'wa-king' ? r.sourceId : `${jurisdiction}:${r.sourceId}`));
  if (rows.some(r => protectedSourceIds.has(r.sourceId))) throw new Error('Accepted row also quarantined');
  return { rows, events, scope: snapshot.scope, revision: snapshot.revision, urls: snapshot.urls, quarantine, protectedSourceIds, sourceRowCount };
}
