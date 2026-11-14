import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { SOURCE } from './source.mjs';
import { ADAPTERS } from './adapters/index.mjs';
import { citySlug, seedJurisdictions } from './jurisdictions.mjs';
import { assertPreviewPilot, prepareSnapshot, withTransaction } from './postgres-pilot.mjs';

const now = () => new Date().toISOString();
const stale = at => !at || Date.now() - Date.parse(at) > 86400000;
const fields = row => JSON.stringify(Object.fromEntries(Object.entries(row).filter(([k]) => !k.startsWith(':') && !k.startsWith('violation_')).sort(([a], [b]) => a.localeCompare(b))));
const digest = value => createHash('sha256').update(value).digest('hex');
const establishmentId = (jurisdiction, officialId) => digest(JSON.stringify([jurisdiction, officialId]));
const sourceUrl = (business, serial, jurisdiction = 'wa-king') => (ADAPTERS[jurisdiction] ?? ADAPTERS['wa-king']).recordUrl(business, serial);
const query = async (client, sql, params = []) => (await client.query(sql, params)).rows;
const establishmentRow = r => ({ id: r.id, jurisdictionId: r.jurisdiction_id, officialId: r.official_id, name: r.name, address: r.address, city: r.city, stateCode: r.state_code, zip: r.zip, latitude: r.latitude, longitude: r.longitude, slug: r.slug, latestInspectionDate: r.latest_inspection_date, latestResult: r.latest_result, latestScore: r.latest_score, inspectionCount: Number(r.inspection_count) });
const SEARCH_VECTOR = "to_tsvector('simple', name || ' ' || coalesce(address,'') || ' ' || coalesce(city,'') || ' ' || coalesce(zip,''))";

export function searchQuery(text) {
  const terms = String(text ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0, 8);
  return terms.length ? terms.map(term => `${term}:*`).join(' & ') : null;
}

export function directPilotUrl(env) {
  let url;
  try { url = new URL(env.DATABASE_URL_UNPOOLED); } catch { throw new Error('Pilot requires explicit direct endpoint'); }
  for (const key of url.searchParams.keys()) {
    if (!['sslmode', 'channel_binding'].includes(key) || url.searchParams.getAll(key).length !== 1) throw new Error('Unsupported direct endpoint parameters');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname.endsWith('.neon.tech') || url.hostname.includes('-pooler.')) throw new Error('Pilot requires direct Neon endpoint');
  if (!['require', 'verify-full'].includes(url.searchParams.get('sslmode'))) throw new Error('Pilot requires TLS');
  return env.DATABASE_URL_UNPOOLED;
}

export function openPostgres(env = process.env) {
  assertPreviewPilot(env);
  return new PostgresStore(new pg.Pool({ connectionString: directPilotUrl(env), max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 }));
}

export class PostgresStore {
  constructor(pool) { this.pool = pool; }
  async close() { await this.pool.end(); }
  async migrate() {
    await withTransaction(this.pool, async client => {
      await client.query('SELECT pg_advisory_xact_lock(78623491)');
      await client.query(readFileSync(new URL('./001_postgres.sql', import.meta.url), 'utf8'));
      await client.query(readFileSync(new URL('./002_national.sql', import.meta.url), 'utf8'));
      const [version] = await query(client, 'SELECT max(version) AS version FROM nf_preview.schema_migrations');
      if (version.version !== 2) throw new Error('Unsupported preview schema version');
      await seedJurisdictions((sql, params) => client.query(sql, params));
    });
  }
  async recentRuns() { return query(this.pool, 'SELECT * FROM nf_preview.refresh_runs ORDER BY id DESC LIMIT 20'); }
  async status() {
    const runs = await this.recentRuns();
    const [good] = await query(this.pool, "SELECT * FROM nf_preview.refresh_runs WHERE status='success' ORDER BY id DESC LIMIT 1");
    const [full] = await query(this.pool, "SELECT finished_at FROM nf_preview.refresh_runs WHERE status='success' AND scope->>'type'='all' ORDER BY id DESC LIMIT 1");
    const last = runs[0];
    return { source: SOURCE, lastSuccess: good?.finished_at ?? null, stale: stale(good?.finished_at), staleAfterSeconds: 86400,
      error: last?.status === 'error' ? last.error : null,
      lastAttempt: last ? { id: Number(last.id), startedAt: last.started_at, finishedAt: last.finished_at, status: last.status, scope: last.scope, rowCount: last.row_count === null ? null : Number(last.row_count), changedCount: last.changed_count === null ? null : Number(last.changed_count) } : null,
      lastSuccessfulScope: good?.scope ?? null, lastFullImport: full?.finished_at ?? null, sourceRevision: good?.source_revision ?? null,
      interpretation: 'Historical inspection findings; not a statement of current safety or closure.' };
  }
  async latest(limit, offset, businessId) {
    const rows = await query(this.pool, `SELECT i.*, f.finished_at AS observed_at FROM nf_preview.inspections i JOIN nf_preview.refresh_runs f ON f.id=i.last_run ${businessId === undefined ? '' : 'WHERE business_id=$3'} ORDER BY inspection_date DESC,i.id LIMIT $1 OFFSET $2`, businessId === undefined ? [limit, offset] : [limit, offset, businessId]);
    return rows.map(r => ({ id: r.id, businessId: r.business_id, serial: r.serial, inspectionDate: r.inspection_date, fields: JSON.parse(r.fields_json), rowCount: Number(r.row_count), observedAt: r.observed_at, stale: stale(r.observed_at), jurisdictionId: r.jurisdiction_id, establishmentId: r.establishment_id, sourceUrl: sourceUrl(r.business_id, r.serial, r.jurisdiction_id) }));
  }
  async catalog() {
    const rows = await query(this.pool, `SELECT j.*, (SELECT count(*) FROM nf_preview.establishments e WHERE e.jurisdiction_id=j.id) AS establishment_count FROM nf_preview.jurisdictions j ORDER BY j.state_name, j.name`);
    return rows.map(r => ({ id: r.id, stateCode: r.state_code, stateName: r.state_name, name: r.name, healthAuthority: r.health_authority, sourceUrl: r.source_url, scoring: JSON.parse(r.scoring_json), coverageStatus: r.coverage_status, enabled: r.enabled, refreshFrequency: r.refresh_frequency, establishmentCount: Number(r.establishment_count) }));
  }
  async searchEstablishments({ q, stateCode, city, limit = 20, offset = 0 } = {}) {
    const tsquery = searchQuery(q);
    if (!tsquery) return [];
    const clauses = [`${SEARCH_VECTOR} @@ to_tsquery('simple', $1)`];
    const params = [tsquery];
    if (stateCode) { params.push(stateCode.toUpperCase()); clauses.push(`state_code=$${params.length}`); }
    if (city) { params.push(city.toLowerCase()); clauses.push(`lower(city)=$${params.length}`); }
    params.push(limit, offset);
    const rows = await query(this.pool, `SELECT * FROM nf_preview.establishments WHERE ${clauses.join(' AND ')} ORDER BY latest_inspection_date DESC NULLS LAST, lower(name), id LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return rows.map(establishmentRow);
  }
  async cityEstablishments(stateCode, city, limit = 50, offset = 0) {
    const rows = await query(this.pool, 'SELECT * FROM nf_preview.establishments WHERE state_code=$1 AND lower(city)=$2 ORDER BY latest_inspection_date DESC NULLS LAST, lower(name), id LIMIT $3 OFFSET $4', [stateCode.toUpperCase(), city.toLowerCase(), limit, offset]);
    return rows.map(establishmentRow);
  }
  async coveredCities() {
    const rows = await query(this.pool, 'SELECT state_code, city, jurisdiction_id, count(*) AS n FROM nf_preview.establishments WHERE city IS NOT NULL GROUP BY state_code, city, jurisdiction_id ORDER BY state_code, lower(city)');
    return rows.map(r => ({ stateCode: r.state_code, city: r.city, jurisdictionId: r.jurisdiction_id, establishmentCount: Number(r.n) }));
  }
  async establishmentBySlug(stateCode, slug) {
    const [row] = await query(this.pool, 'SELECT * FROM nf_preview.establishments WHERE state_code=$1 AND slug=$2', [stateCode.toUpperCase(), slug]);
    if (!row) return null;
    const inspections = await query(this.pool, 'SELECT i.*, f.finished_at AS observed_at FROM nf_preview.inspections i JOIN nf_preview.refresh_runs f ON f.id=i.last_run WHERE i.establishment_id=$1 ORDER BY i.inspection_date DESC, i.id', [row.id]);
    const [jurisdiction] = await query(this.pool, 'SELECT * FROM nf_preview.jurisdictions WHERE id=$1', [row.jurisdiction_id]);
    return {
      ...establishmentRow(row),
      jurisdiction: jurisdiction ? { id: jurisdiction.id, name: jurisdiction.name, healthAuthority: jurisdiction.health_authority, sourceUrl: jurisdiction.source_url, scoring: JSON.parse(jurisdiction.scoring_json), coverageStatus: jurisdiction.coverage_status } : null,
      inspections: inspections.map(r => ({ id: r.id, businessId: r.business_id, serial: r.serial, inspectionDate: r.inspection_date, fields: JSON.parse(r.fields_json), rowCount: Number(r.row_count), observedAt: r.observed_at, stale: stale(r.observed_at), sourceUrl: sourceUrl(r.business_id, r.serial, r.jurisdiction_id) })),
    };
  }
  async feedRows(ids) {
    if (!ids.length) return [];
    return query(this.pool, 'SELECT s.event_id,s.raw_json,f.finished_at AS observed_at FROM nf_preview.source_rows s JOIN nf_preview.inspections i ON i.id=s.event_id JOIN nf_preview.refresh_runs f ON f.id=i.last_run WHERE s.active AND s.event_id=ANY($1::text[]) ORDER BY s.event_id,s.source_id', [ids]);
  }
  async detail(id) {
    // A single repeatable-read transaction prevents a promotion splitting this response.
    return withTransaction(this.pool, async client => {
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      let [record] = await query(client, 'SELECT * FROM nf_preview.inspections WHERE id=$1', [id]);
      const active = Boolean(record);
      if (!record) {
        const [prior] = await query(client, 'SELECT raw_json FROM nf_preview.row_revisions WHERE event_id=$1 ORDER BY first_run DESC LIMIT 1', [id]);
        if (!prior) return null;
        const raw = JSON.parse(prior.raw_json);
        const [run] = await query(client, 'SELECT max(last_run) AS run FROM nf_preview.source_rows WHERE event_id=$1', [id]);
        record = { business_id: raw.business_id, serial: raw.inspection_serial_num, fields_json: fields(raw), last_run: run.run };
      }
      const rows = await query(client, 'SELECT raw_json FROM nf_preview.source_rows WHERE event_id=$1 AND active ORDER BY source_id', [id]);
      const revisions = await query(client, 'SELECT r.source_id,r.hash,r.raw_json,r.first_run,f.finished_at AS observed_at FROM nf_preview.row_revisions r JOIN nf_preview.refresh_runs f ON f.id=r.first_run WHERE event_id=$1 ORDER BY first_run,source_id', [id]);
      const changes = await query(client, 'SELECT * FROM nf_preview.row_changes WHERE source_id IN (SELECT source_id FROM nf_preview.row_revisions WHERE event_id=$1) ORDER BY id', [id]);
      const violations = await query(client, 'SELECT * FROM nf_preview.violations WHERE event_id=$1 ORDER BY source_id', [id]);
      const [observed] = await query(client, 'SELECT finished_at FROM nf_preview.refresh_runs WHERE id=$1', [record.last_run]);
      return { id, active, businessId: record.business_id, serial: record.serial, fields: JSON.parse(record.fields_json), completeEvent: active, rows: rows.map(r => JSON.parse(r.raw_json)),
        violations, revisions: revisions.map(r => ({ ...r, first_run: Number(r.first_run), raw_json: JSON.parse(r.raw_json) })), changes: changes.map(r => ({ ...r, id: Number(r.id), run_id: Number(r.run_id) })), sourceUrl: sourceUrl(record.business_id, record.serial), observedAt: observed?.finished_at, stale: stale(observed?.finished_at) };
    });
  }
  async history(businessId, limit, offset) {
    const [coverage] = await query(this.pool, "SELECT finished_at FROM nf_preview.refresh_runs WHERE status='success' AND (scope->>'type'='all' OR (scope->>'type'='business' AND scope->>'businessId'=$1)) ORDER BY id DESC LIMIT 1", [businessId]);
    return { businessId, complete: Boolean(coverage), completeAsOf: coverage?.finished_at ?? null, items: await this.latest(limit, offset, businessId) };
  }
}

export async function importPostgres(store, source, scope = { type: 'latest', limit: 5 }, jurisdictionId = 'wa-king') {
  if (!ADAPTERS[jurisdictionId]) throw new Error(`Cannot import jurisdiction ${jurisdictionId} without an adapter`);
  const started = now();
  const client = await store.pool.connect();
  let locked = false;
  let discard;
  try {
    const [lock] = await query(client, 'SELECT pg_try_advisory_lock(78623491) AS locked');
    if (!lock.locked) throw new Error('Another preview importer is active');
    locked = true;
    const snapshot = prepareSnapshot(await source.snapshot(scope));
    if (JSON.stringify(snapshot.scope) !== JSON.stringify(scope)) throw new Error('Source scope does not match requested scope');
    return await withTransaction({ connect: async () => ({ query: client.query.bind(client), release(error) { discard = error; } }) }, async tx => {
      const [run] = await query(tx, "INSERT INTO nf_preview.refresh_runs(started_at,status,scope) VALUES($1,'running',$2) RETURNING id", [started, JSON.stringify(scope)]);
      const all = await query(tx, 'SELECT * FROM nf_preview.source_rows');
      const oldRows = new Map(all.map(r => [r.source_id, r]));
      const seen = new Set(snapshot.rows.map(r => r.sourceId));
      // Imports only ever add/remove rows inside their own jurisdiction.
      const inScope = old => old.jurisdiction_id === jurisdictionId && (scope.type === 'all' || (scope.type === 'business' && JSON.parse(old.raw_json).business_id === scope.businessId) || snapshot.events.has(old.event_id));
      let changed = 0;
      for (const old of all) {
        if (old.active && inScope(old) && !seen.has(old.source_id)) {
          await tx.query('UPDATE nf_preview.source_rows SET active=false,last_run=$1 WHERE source_id=$2', [run.id, old.source_id]);
          await tx.query("INSERT INTO nf_preview.row_changes(run_id,source_id,action,old_hash) VALUES($1,$2,'removed',$3)", [run.id, old.source_id, old.hash]);
          changed++;
        }
      }
      for (const r of snapshot.rows) {
        const old = oldRows.get(r.sourceId);
        if (old && old.event_id !== r.id && !inScope(old)) throw new Error('Source row moved outside import scope; run full import to reconcile');
        if (!old || old.hash !== r.hash || !old.active) {
          await tx.query('INSERT INTO nf_preview.row_changes(run_id,source_id,action,old_hash,new_hash) VALUES($1,$2,$3,$4,$5)', [run.id, r.sourceId, !old ? 'added' : !old.active ? 'restored' : 'changed', old?.hash ?? null, r.hash]);
          changed++;
        }
        await tx.query('INSERT INTO nf_preview.row_revisions VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [r.sourceId, r.hash, r.id, r.raw, run.id]);
        await tx.query('INSERT INTO nf_preview.source_rows(source_id,event_id,hash,raw_json,active,last_run,jurisdiction_id) VALUES($1,$2,$3,$4,true,$5,$6) ON CONFLICT(source_id) DO UPDATE SET event_id=excluded.event_id,hash=excluded.hash,raw_json=excluded.raw_json,active=true,last_run=excluded.last_run,jurisdiction_id=excluded.jurisdiction_id', [r.sourceId, r.id, r.hash, r.raw, run.id, jurisdictionId]);
      }
      await tx.query('DELETE FROM nf_preview.violations');
      await tx.query('DELETE FROM nf_preview.inspections');
      await tx.query('DELETE FROM nf_preview.establishments');
      const grouped = new Map();
      for (const r of await query(tx, 'SELECT * FROM nf_preview.source_rows WHERE active ORDER BY source_id')) {
        const raw = JSON.parse(r.raw_json);
        const g = grouped.get(r.event_id) ?? { row: raw, count: 0, run: Number(r.last_run), jurisdiction: r.jurisdiction_id };
        if (fields(g.row) !== fields(raw)) throw new Error('Conflicting inspection fields in retained snapshot');
        g.count++; g.run = Math.max(g.run, Number(r.last_run)); grouped.set(r.event_id, g);
        if (raw.violation_description || raw.violation_type) await tx.query('INSERT INTO nf_preview.violations VALUES($1,$2,$3,$4,$5)', [r.source_id, r.event_id, raw.violation_type ?? null, raw.violation_description ?? null, raw.violation_points ?? null]);
      }
      const establishments = new Map();
      for (const [, g] of grouped) {
        const adapter = ADAPTERS[g.jurisdiction];
        if (!adapter) throw new Error(`Saved rows reference jurisdiction ${g.jurisdiction} without an adapter`);
        const details = adapter.establishment(g.row);
        const summary = adapter.inspectionSummary(g.row);
        const id = establishmentId(g.jurisdiction, details.officialId);
        const prev = establishments.get(id);
        if (!prev) establishments.set(id, { ...details, id, jurisdiction: g.jurisdiction, stateCode: adapter.stateCode, count: 1, latest: summary, run: g.run });
        else {
          prev.count++; prev.run = Math.max(prev.run, g.run);
          if ((summary.date ?? '') > (prev.latest.date ?? '')) { Object.assign(prev, details); prev.latest = summary; }
        }
      }
      for (const [id, g] of grouped) await tx.query('INSERT INTO nf_preview.inspections(id,business_id,serial,inspection_date,fields_json,row_count,last_run,jurisdiction_id,establishment_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id, g.row.business_id, g.row.inspection_serial_num, g.row.inspection_date, fields(g.row), g.count, g.run, g.jurisdiction, establishmentId(g.jurisdiction, ADAPTERS[g.jurisdiction].establishment(g.row).officialId)]);
      for (const e of establishments.values()) await tx.query('INSERT INTO nf_preview.establishments(id,jurisdiction_id,official_id,name,address,city,state_code,zip,latitude,longitude,slug,latest_inspection_date,latest_result,latest_score,inspection_count,last_run) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)', [e.id, e.jurisdiction, e.officialId, e.name, e.address, e.city, e.stateCode, e.zip, e.latitude, e.longitude, `${citySlug(e.name) || 'establishment'}-${e.id.slice(0, 6)}`, e.latest.date, e.latest.result, e.latest.score, e.count, e.run]);
      await tx.query("UPDATE nf_preview.refresh_runs SET finished_at=$1,status='success',source_revision=$2,row_count=$3,changed_count=$4,request_urls=$5 WHERE id=$6", [now(), snapshot.revision, snapshot.rows.length, changed, JSON.stringify(snapshot.urls), run.id]);
      return { runId: Number(run.id), rowCount: snapshot.rows.length, changedCount: changed, scope, revision: snapshot.revision };
    });
  } catch (error) {
    if (locked) await client.query("INSERT INTO nf_preview.refresh_runs(started_at,finished_at,status,scope,error) VALUES($1,$2,'error',$3,$4)", [started, now(), JSON.stringify(scope), 'Import failed; last committed snapshot retained']);
    throw error;
  } finally {
    try { if (locked && !discard) await client.query('SELECT pg_advisory_unlock(78623491)'); }
    catch (error) { discard = error; }
    finally { client.release(discard); }
  }
}
