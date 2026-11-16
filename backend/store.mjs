import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SOURCE } from './source.mjs';

export const eventId = (business, serial) => createHash('sha256').update(JSON.stringify([business, serial])).digest('hex');
const canonical = row => JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))));
const hash = text => createHash('sha256').update(text).digest('hex');
const now = () => new Date().toISOString();
const isStale = observed => !observed || Date.now() - Date.parse(observed) > 86400000;
const eventFields = row => Object.fromEntries(Object.entries(row).filter(([k]) => !k.startsWith(':') && !k.startsWith('violation_')));

export class Store {
  constructor(db) {
    this.db = db;
    db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000;');
    const initialized = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get();
    if (!initialized) db.exec(readFileSync(new URL('./001_initial.sql', import.meta.url), 'utf8'));
    else if (db.prepare('SELECT max(version) version FROM schema_migrations').get().version !== 1) throw new Error('Unsupported inspection database schema version');
  }
  close() { this.db.close(); }
  status() {
    const last = this.db.prepare('SELECT * FROM refresh_runs ORDER BY id DESC LIMIT 1').get();
    const good = this.db.prepare("SELECT * FROM refresh_runs WHERE status='success' ORDER BY id DESC LIMIT 1").get();
    const all = this.db.prepare("SELECT finished_at FROM refresh_runs WHERE status='success' AND json_extract(scope,'$.type')='all' ORDER BY id DESC LIMIT 1").get();
    return {
      source: SOURCE, lastSuccess: good?.finished_at ?? null,
      stale: !good || Date.now() - Date.parse(good.finished_at) > 24 * 3600000,
      staleAfterSeconds: 86400, error: last?.status === 'error' ? last.error : null,
      lastAttempt: last ? { id: last.id, startedAt: last.started_at, finishedAt: last.finished_at, status: last.status, scope: JSON.parse(last.scope), rowCount: last.row_count, changedCount: last.changed_count } : null,
      lastSuccessfulScope: good ? JSON.parse(good.scope) : null,
      lastFullImport: all?.finished_at ?? null,
      sourceRevision: good?.source_revision ?? null,
      interpretation: 'Historical inspection findings; not a statement of current safety or closure.',
    };
  }
  latest(limit, offset, businessId) {
    const items = this.db.prepare(`SELECT * FROM inspections ${businessId === undefined ? '' : 'WHERE business_id=?'} ORDER BY inspection_date DESC,id LIMIT ? OFFSET ?`).all(...(businessId === undefined ? [] : [businessId]), limit, offset);
    return items.map(r => {
      const observedAt = this.db.prepare('SELECT finished_at FROM refresh_runs WHERE id=?').get(r.last_run)?.finished_at;
      return { id: r.id, businessId: r.business_id, serial: r.serial, inspectionDate: r.inspection_date, fields: JSON.parse(r.fields_json), rowCount: r.row_count, observedAt, stale: isStale(observedAt), sourceUrl: `${SOURCE}?${new URLSearchParams({ business_id: r.business_id, inspection_serial_num: r.serial })}` };
    });
  }
  detail(id) {
    let record = this.db.prepare('SELECT * FROM inspections WHERE id=?').get(id);
    const active = Boolean(record);
    if (!record) {
      const prior = this.db.prepare('SELECT raw_json FROM row_revisions WHERE event_id=? ORDER BY first_run DESC LIMIT 1').get(id);
      if (!prior) return null;
      const raw = JSON.parse(prior.raw_json);
      record = { business_id: raw.business_id, serial: raw.inspection_serial_num, fields_json: canonical(eventFields(raw)), last_run: this.db.prepare('SELECT max(last_run) run FROM source_rows WHERE event_id=?').get(id).run };
    }
    const rows = this.db.prepare('SELECT raw_json FROM source_rows WHERE event_id=? AND active=1 ORDER BY source_id').all(id).map(r => JSON.parse(r.raw_json));
    const revisions = this.db.prepare('SELECT r.source_id,r.hash,r.raw_json,r.first_run,f.finished_at observed_at FROM row_revisions r JOIN refresh_runs f ON f.id=r.first_run WHERE event_id=? ORDER BY first_run,source_id').all(id).map(r => ({ ...r, raw_json: JSON.parse(r.raw_json) }));
    const changes = this.db.prepare('SELECT c.* FROM row_changes c WHERE source_id IN (SELECT source_id FROM row_revisions WHERE event_id=?) ORDER BY id').all(id);
    const observedAt = this.db.prepare('SELECT finished_at FROM refresh_runs WHERE id=?').get(record.last_run)?.finished_at;
    return { id, active, businessId: record.business_id, serial: record.serial, fields: JSON.parse(record.fields_json), completeEvent: active, rows, violations: this.db.prepare('SELECT * FROM violations WHERE event_id=? ORDER BY source_id').all(id), revisions, changes, sourceUrl: `${SOURCE}?${new URLSearchParams({ business_id: record.business_id, inspection_serial_num: record.serial })}`, observedAt, stale: isStale(observedAt) };
  }
  history(businessId, limit, offset) {
    const coverage = this.db.prepare("SELECT finished_at FROM refresh_runs WHERE status='success' AND (json_extract(scope,'$.type')='all' OR (json_extract(scope,'$.type')='business' AND json_extract(scope,'$.businessId')=?)) ORDER BY id DESC LIMIT 1").get(businessId);
    return { businessId, complete: Boolean(coverage), completeAsOf: coverage?.finished_at ?? null, items: this.latest(limit, offset, businessId) };
  }
}

export function openStore(path = process.env.NF_DB_PATH || resolve('.data/inspections.sqlite')) {
  if (process.env.VERCEL) throw new Error('Local SQLite adapter is not enabled on Vercel; durable hosted storage requires an owner decision');
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  try { return new Store(db); }
  catch (error) { db.close(); throw error; }
}

export async function importSource(store, source, scope = { type: 'all' }) {
  const db = store.db;
  const started = now();
  // Hold a writer lock through collection: concurrent importers cannot interleave snapshots.
  db.exec('BEGIN IMMEDIATE');
  try {
    const snap = await source.snapshot(scope);
    const run = Number(db.prepare("INSERT INTO refresh_runs(started_at,status,scope) VALUES(?,'running',?)").run(started, JSON.stringify(snap.scope)).lastInsertRowid);
    const seen = new Set();
    const events = new Map();
    const prepared = [];
    for (const row of snap.rows) {
      if (!row[':id'] || !row.business_id || !row.inspection_serial_num || !row.inspection_date) throw new Error('Source row missing stable keys/date');
      if (seen.has(row[':id'])) throw new Error('Duplicate source row during pagination');
      if (snap.scope.type === 'business' && row.business_id !== snap.scope.businessId) throw new Error('Source row outside requested business');
      seen.add(row[':id']);
      const id = eventId(row.business_id, row.inspection_serial_num);
      const fields = canonical(eventFields(row));
      if (events.has(id) && events.get(id).fields !== fields) throw new Error('Conflicting inspection fields; refusing lossy grouping');
      events.set(id, { row, fields });
      prepared.push({ row, id, raw: canonical(row) });
    }
    let changed = 0;
    const existing = db.prepare('SELECT * FROM source_rows WHERE active=1').all();
    for (const old of existing) {
      const inScope = snap.scope.type === 'all' || (snap.scope.type === 'business' && JSON.parse(old.raw_json).business_id === snap.scope.businessId) || events.has(old.event_id);
      if (inScope && !seen.has(old.source_id)) {
        db.prepare('UPDATE source_rows SET active=0,last_run=? WHERE source_id=?').run(run, old.source_id);
        db.prepare("INSERT INTO row_changes(run_id,source_id,action,old_hash) VALUES(?,?,'removed',?)").run(run, old.source_id, old.hash);
        changed++;
      }
    }
    for (const { row, id, raw } of prepared) {
      const digest = hash(raw);
      const old = db.prepare('SELECT * FROM source_rows WHERE source_id=?').get(row[':id']);
      if (old && old.event_id !== id && snap.scope.type !== 'all' && !events.has(old.event_id) && !(snap.scope.type === 'business' && JSON.parse(old.raw_json).business_id === snap.scope.businessId)) throw new Error('Source row moved outside import scope; run full import to reconcile');
      if (!old || old.hash !== digest || !old.active) {
        db.prepare('INSERT INTO row_changes(run_id,source_id,action,old_hash,new_hash) VALUES(?,?,?,?,?)').run(run, row[':id'], !old ? 'added' : !old.active ? 'restored' : 'changed', old?.hash ?? null, digest);
        changed++;
      }
      db.prepare('INSERT OR IGNORE INTO row_revisions VALUES(?,?,?,?,?)').run(row[':id'], digest, id, raw, run);
      db.prepare('INSERT INTO source_rows VALUES(?,?,?,?,1,?) ON CONFLICT(source_id) DO UPDATE SET event_id=excluded.event_id,hash=excluded.hash,raw_json=excluded.raw_json,active=1,last_run=excluded.last_run').run(row[':id'], id, digest, raw, run);
    }
    db.exec('DELETE FROM violations; DELETE FROM inspections;');
    const grouped = new Map();
    for (const r of db.prepare('SELECT * FROM source_rows WHERE active=1 ORDER BY source_id').all()) {
      const raw = JSON.parse(r.raw_json);
      const group = grouped.get(r.event_id) ?? { row: raw, count: 0, run: r.last_run };
      group.count++;
      group.run = Math.max(group.run, r.last_run);
      grouped.set(r.event_id, group);
      if (raw.violation_description || raw.violation_type) db.prepare('INSERT INTO violations VALUES(?,?,?,?,?)').run(r.source_id, r.event_id, raw.violation_type ?? null, raw.violation_description ?? null, raw.violation_points ?? null);
    }
    for (const [id, g] of grouped) db.prepare('INSERT INTO inspections VALUES(?,?,?,?,?,?,?)').run(id, g.row.business_id, g.row.inspection_serial_num, g.row.inspection_date, canonical(eventFields(g.row)), g.count, g.run);
    db.prepare("UPDATE refresh_runs SET finished_at=?,status='success',source_revision=?,row_count=?,changed_count=?,request_urls=? WHERE id=?").run(now(), snap.revision, snap.rows.length, changed, JSON.stringify(snap.urls), run);
    db.exec('COMMIT');
    return { runId: run, rowCount: snap.rows.length, changedCount: changed, scope: snap.scope, revision: snap.revision };
  } catch (error) {
    db.exec('ROLLBACK');
    db.prepare("INSERT INTO refresh_runs(started_at,finished_at,status,scope,error) VALUES(?,?,'error',?,?)").run(started, now(), JSON.stringify(scope), String(error.message));
    throw error;
  }
}
