import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import pg from 'pg';
import {canonicalCityKey,cityKeySql} from './location-catalog.mjs';
import { SOURCE } from './source.mjs';
import { ADAPTERS } from './adapters/index.mjs';
import { citySlug, seedJurisdictions, jurisdictionById } from './jurisdictions.mjs';
import { assertPreviewPilot, prepareSnapshot, withTransaction } from './postgres-pilot.mjs';

const PUBLISHED = "jurisdiction_id IN (SELECT id FROM nf_preview.jurisdictions WHERE enabled AND coverage_status IN ('available','limited'))";
const now = () => new Date().toISOString();
const stale = at => !at || Date.now() - Date.parse(at) > 86400000;
const fields = row => JSON.stringify(Object.fromEntries(Object.entries(row).filter(([k]) => !k.startsWith(':') && !k.startsWith('violation_')).sort(([a], [b]) => a.localeCompare(b))));
const digest = value => createHash('sha256').update(value).digest('hex');
const establishmentId = (jurisdiction, officialId) => digest(JSON.stringify([jurisdiction, officialId]));
const sourceUrl = (business, serial, jurisdiction = 'wa-king') => { if (!ADAPTERS[jurisdiction]) throw new Error('Unknown saved jurisdiction'); return ADAPTERS[jurisdiction].recordUrl(business, serial); };
const query = async (client, sql, params = []) => (await client.query(sql, params)).rows;
const establishmentRow = r => ({ id: r.id, jurisdictionId: r.jurisdiction_id, officialId: r.official_id, name: r.name, address: r.address, city: r.city, stateCode: r.state_code, zip: r.zip, latitude: r.latitude, longitude: r.longitude, slug: r.slug, latestInspectionDate: r.latest_inspection_date, latestResult: r.latest_result, latestScore: r.latest_score, inspectionCount: Number(r.inspection_count) });
const SEARCH_VECTOR = "to_tsvector('simple', name || ' ' || coalesce(address,'') || ' ' || coalesce(city,'') || ' ' || coalesce(zip,'') || ' ' || state_code || ' ' || search_text)";

// Bound parameter counts and network round trips for complete source imports.
async function insertBatch(client, table, columns, rows, suffix = '') {
  for (let offset = 0; offset < rows.length; offset += 500) {
    const batch = rows.slice(offset, offset + 500);
    const values = batch.map((row, i) => '(' + row.map((_, j) => '$' + (i * columns.length + j + 1)).join(',') + ')').join(',');
    await client.query(`INSERT INTO nf_preview.${table}(${columns.join(',')}) VALUES ${values} ${suffix}`, batch.flat());
  }
}

export function searchQuery(text) {
  const terms = String(text ?? '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 8);
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
      await client.query(readFileSync(new URL('./003_source_operations.sql', import.meta.url), 'utf8'));
      await client.query(readFileSync(new URL('./004_backfill.sql', import.meta.url), 'utf8'));
      const [version] = await query(client, 'SELECT max(version) AS version FROM nf_preview.schema_migrations');
      if (version.version !== 4) throw new Error('Unsupported preview schema version');
      await seedJurisdictions((sql, params) => client.query(sql, params));
    });
  }
  async recentRuns() { return query(this.pool, 'SELECT * FROM nf_preview.refresh_runs ORDER BY id DESC LIMIT 20'); }
  async operations() {
    const [sources, runs, [counts], [storage]] = await Promise.all([
      this.catalog(), this.recentRuns(),
      query(this.pool, 'SELECT (SELECT count(*)::int FROM nf_preview.establishments) AS establishments, (SELECT count(*)::int FROM nf_preview.inspections) AS inspections, (SELECT count(*)::int FROM nf_preview.source_rows) AS source_rows, (SELECT count(*)::int FROM nf_preview.row_revisions) AS revisions'),
      query(this.pool, "SELECT pg_database_size(current_database())::text AS database_bytes, coalesce(sum(pg_total_relation_size(c.oid)),0)::text AS schema_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='nf_preview' AND c.relkind='r'"),
    ]);
    const attempts = await query(this.pool, 'SELECT DISTINCT ON(jurisdiction_id) * FROM nf_preview.refresh_runs ORDER BY jurisdiction_id,id DESC');
    const states = await query(this.pool, "SELECT DISTINCT ON(jurisdiction_id) jurisdiction_id,finished_at FROM nf_preview.refresh_runs WHERE status='success' ORDER BY jurisdiction_id,id DESC");
    return { counts, storage: { databaseBytes: storage.database_bytes, schemaBytes: storage.schema_bytes, note: 'Shared physical database; provider compute and billing are not connected.' },
      sources: sources.map(source => ({ ...source, lastAttempt: attempts.find(run => run.jurisdiction_id === source.id) ?? null, lastSuccess: states.find(s => s.jurisdiction_id === source.id)?.finished_at ?? null })),
      runs, integrations: { advertising: 'not_connected', analytics: 'not_connected', searchConsole: 'not_connected' } };
  }
  async status() {
    const runs = await query(this.pool, "SELECT * FROM nf_preview.refresh_runs WHERE jurisdiction_id='wa-king' ORDER BY id DESC LIMIT 20");
    const [good] = await query(this.pool, "SELECT * FROM nf_preview.refresh_runs WHERE jurisdiction_id='wa-king' AND status='success' ORDER BY id DESC LIMIT 1");
    const [full] = await query(this.pool, "SELECT finished_at FROM nf_preview.refresh_runs WHERE jurisdiction_id='wa-king' AND status='success' AND scope->>'type'='all' ORDER BY id DESC LIMIT 1");
    const last = runs[0];
    return { source: SOURCE, lastSuccess: good?.finished_at ?? null, stale: stale(good?.finished_at), staleAfterSeconds: 86400,
      error: last?.status === 'error' ? last.error : null,
      lastAttempt: last ? { id: Number(last.id), startedAt: last.started_at, finishedAt: last.finished_at, status: last.status, scope: last.scope, rowCount: last.row_count === null ? null : Number(last.row_count), changedCount: last.changed_count === null ? null : Number(last.changed_count) } : null,
      lastSuccessfulScope: good?.scope ?? null, lastFullImport: full?.finished_at ?? null, sourceRevision: good?.source_revision ?? null,
      interpretation: 'Historical inspection findings; not a statement of current safety or closure.' };
  }
  async latest(limit, offset, businessId, jurisdictionId) {
    const rows = await query(this.pool, `SELECT i.*, f.finished_at AS observed_at FROM nf_preview.inspections i JOIN nf_preview.refresh_runs f ON f.id=i.last_run WHERE ($3::text IS NULL OR business_id=$3) AND ($4::text IS NULL OR i.jurisdiction_id=$4) ORDER BY inspection_date DESC,i.id LIMIT $1 OFFSET $2`, [limit, offset, businessId ?? null, jurisdictionId ?? null]);
    return rows.map(r => ({ id: r.id, businessId: r.business_id, serial: r.serial, inspectionDate: r.inspection_date, fields: JSON.parse(r.fields_json), rowCount: Number(r.row_count), observedAt: r.observed_at, stale: stale(r.observed_at), jurisdictionId: r.jurisdiction_id, establishmentId: r.establishment_id, sourceUrl: sourceUrl(r.business_id, r.serial, r.jurisdiction_id) }));
  }
  async feedCoverage(city = '') {
    const [row] = await query(this.pool, `SELECT count(*)::int AS inspections,count(DISTINCT i.business_id)::int AS businesses,min(i.inspection_date) AS first,max(i.inspection_date) AS last
      FROM nf_preview.inspections i JOIN nf_preview.establishments e ON e.id=i.establishment_id
      WHERE i.jurisdiction_id='wa-king' AND i.jurisdiction_id IN (SELECT id FROM nf_preview.jurisdictions WHERE enabled AND coverage_status IN ('available','limited')) AND ($1::text='' OR ${cityKeySql('e.city','e.state_code')}=$1)`,[canonicalCityKey('WA',city)]);
    return row;
  }
  async homeFeed(limit = 100, jurisdictionId = 'wa-king', city = '', since = null) {
    // Filter before limiting. Weekly rankings include every event; default lists use newest per business.
    const rows = await query(this.pool, `SELECT latest.*, f.finished_at AS observed_at FROM (
      SELECT ${since ? '' : 'DISTINCT ON (i.business_id)'} i.* FROM nf_preview.inspections i
      JOIN nf_preview.establishments e ON e.id=i.establishment_id
      WHERE i.jurisdiction_id=$2 AND i.jurisdiction_id IN (SELECT id FROM nf_preview.jurisdictions WHERE enabled AND coverage_status IN ('available','limited'))
        AND ($3::text='' OR ${cityKeySql('e.city','e.state_code')}=$3)
        AND ($4::text IS NULL OR i.inspection_date >= $4)
      ORDER BY i.business_id,i.inspection_date DESC,i.id
    ) latest JOIN nf_preview.refresh_runs f ON f.id=latest.last_run
    ORDER BY latest.inspection_date DESC,latest.id LIMIT CASE WHEN $4::text IS NULL THEN $1::int ELSE NULL END`, [limit,jurisdictionId,canonicalCityKey(jurisdictionById(jurisdictionId)?.stateCode??'',city),since]);
    return rows.map(r => ({id:r.id,businessId:r.business_id,serial:r.serial,inspectionDate:r.inspection_date,fields:JSON.parse(r.fields_json),rowCount:Number(r.row_count),observedAt:r.observed_at,jurisdictionId:r.jurisdiction_id}));
  }
  async catalog() {
    const rows = await query(this.pool, `WITH stats AS (SELECT jurisdiction_id,count(*)::int AS inspections,min(inspection_date) AS first,max(inspection_date) AS last FROM nf_preview.inspections GROUP BY jurisdiction_id)
      SELECT j.*,coalesce(s.inspections,0) AS inspection_count,s.first AS first_inspection_date,s.last AS last_inspection_date,
      (SELECT count(*) FROM nf_preview.establishments e WHERE e.jurisdiction_id=j.id) AS establishment_count,
      (SELECT finished_at FROM nf_preview.refresh_runs r WHERE r.jurisdiction_id=j.id AND r.status='success' ORDER BY r.id DESC LIMIT 1) AS last_success,
      (SELECT status FROM nf_preview.refresh_runs r WHERE r.jurisdiction_id=j.id ORDER BY r.id DESC LIMIT 1) AS last_attempt_status,
      coalesce((SELECT rejected_count=0 FROM nf_preview.refresh_runs r WHERE r.jurisdiction_id=j.id AND r.status='success' AND scope->>'type'='all' ORDER BY r.id DESC LIMIT 1),false)
        AND NOT EXISTS(SELECT 1 FROM nf_preview.quarantined_rows q WHERE q.jurisdiction_id=j.id AND q.active) AS full_import_verified,
      (SELECT count(*)::int FROM nf_preview.quarantined_rows q WHERE q.jurisdiction_id=j.id AND q.active) AS rejected_row_count,
      EXISTS(SELECT 1 FROM nf_preview.refresh_runs r WHERE r.jurisdiction_id=j.id AND r.status='success' AND scope->>'type'='all') AS full_backfill_processed,
      (SELECT finished_at FROM nf_preview.refresh_runs r WHERE r.jurisdiction_id=j.id AND r.status='success' AND trigger_kind='vercel-cron' ORDER BY r.id DESC LIMIT 1) AS last_scheduled_success
      FROM nf_preview.jurisdictions j LEFT JOIN stats s ON s.jurisdiction_id=j.id ORDER BY j.state_name,j.name`);
    return rows.map(r => ({ id:r.id,stateCode:r.state_code,stateName:r.state_name,name:r.name,healthAuthority:r.health_authority,sourceUrl:r.source_url,scoring:JSON.parse(r.scoring_json),coverageStatus:r.full_import_verified&&['available','limited'].includes(r.coverage_status)?'available':r.coverage_status,enabled:r.enabled,refreshFrequency:r.refresh_frequency,establishmentCount:Number(r.establishment_count),inspectionCount:Number(r.inspection_count),firstInspectionDate:r.first_inspection_date,lastInspectionDate:r.last_inspection_date,lastSuccess:r.last_success,fullImportVerified:!!r.full_import_verified,rejectedRowCount:Number(r.rejected_row_count),fullBackfillProcessed:!!r.full_backfill_processed,lastScheduledSuccess:r.last_scheduled_success??null,lastAttemptStatus:r.last_attempt_status??null }));
  }

  // Owner-controlled publication switch. Disabling a jurisdiction removes it from every public
  // feed (see PUBLISHED) and from refresh/sync; re-seeding never overwrites this runtime value.
  async setJurisdictionEnabled(id, enabled) {
    if (!jurisdictionById(id)) return false;
    const rows = await query(this.pool, 'UPDATE nf_preview.jurisdictions SET enabled=$2 WHERE id=$1 RETURNING id', [id, enabled === true]);
    return rows.length > 0;
  }
  async searchEstablishments({ q = '', stateCode = '', city = '', excludeCity = '', jurisdictionId = '', sort = 'date', limit = 20, offset = 0 } = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 100000) throw new Error('Invalid search pagination');
    const tsquery = searchQuery(q);
    if (!tsquery) return [];
    const ordering = { date: 'latest_inspection_date DESC NULLS LAST, lower(name), id', name: 'lower(name), id', result: 'latest_result NULLS LAST, lower(name), id' }[sort];
    if (!ordering) throw new Error('Unsupported search sort');
    const clauses = [PUBLISHED, `${SEARCH_VECTOR} @@ to_tsquery('simple', $1)`];
    const params = [tsquery];
    if (stateCode) { params.push(stateCode.toUpperCase()); clauses.push(`state_code=$${params.length}`); }
    if (city) { params.push(canonicalCityKey(stateCode,city)); clauses.push(`${cityKeySql('city')}=$${params.length}`); }
    if (excludeCity && stateCode) { params.push(canonicalCityKey(stateCode,excludeCity)); clauses.push(`(${cityKeySql('city')} IS DISTINCT FROM $${params.length})`); }
    if (jurisdictionId) { params.push(jurisdictionId); clauses.push(`jurisdiction_id=$${params.length}`); }
    params.push(limit, offset);
    const rows = await query(this.pool, `SELECT * FROM nf_preview.establishments WHERE ${clauses.join(' AND ')} ORDER BY ${ordering} LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return rows.map(establishmentRow);
  }
  async cityEstablishments(stateCode, city, limit = 50, offset = 0) {
    const rows = await query(this.pool, `SELECT * FROM nf_preview.establishments WHERE ${PUBLISHED} AND state_code=$1 AND ${cityKeySql('city')}=$2 ORDER BY latest_inspection_date DESC NULLS LAST, lower(name), id LIMIT $3 OFFSET $4`, [stateCode.toUpperCase(), canonicalCityKey(stateCode,city), limit, offset]);
    return rows.map(establishmentRow);
  }
  async establishmentSlugs(limit = 5000) {
    const rows = await query(this.pool, `SELECT state_code, slug FROM nf_preview.establishments WHERE ${PUBLISHED} ORDER BY state_code, slug LIMIT $1`, [limit]);
    return rows.map(r => ({ stateCode: r.state_code, slug: r.slug }));
  }
  async businessProfiles(jurisdictionId, officialIds) {
    if (!officialIds.length) return [];
    const rows=await query(this.pool,`SELECT official_id,slug,state_code FROM nf_preview.establishments WHERE ${PUBLISHED} AND jurisdiction_id=$1 AND official_id=ANY($2::text[])`,[jurisdictionId,officialIds]);
    return rows.map(r=>({officialId:r.official_id,slug:r.slug,stateCode:r.state_code}));
  }
  async coveredCities() {
    const rows = await query(this.pool, `WITH dates AS (SELECT establishment_id,min(inspection_date) AS first,max(inspection_date) AS last FROM nf_preview.inspections GROUP BY establishment_id)
      SELECT e.state_code,e.city,e.jurisdiction_id,count(*) AS n,sum(e.inspection_count)::int AS inspections,min(d.first) AS first,max(d.last) AS last,
      avg(latitude) FILTER(WHERE latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND latitude<>0 AND longitude<>0) AS latitude,
      avg(longitude) FILTER(WHERE latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND latitude<>0 AND longitude<>0) AS longitude
      FROM nf_preview.establishments e LEFT JOIN dates d ON d.establishment_id=e.id WHERE e.city IS NOT NULL GROUP BY e.state_code,e.city,e.jurisdiction_id ORDER BY e.state_code,lower(e.city)`);
    return rows.map(r=>({stateCode:r.state_code,city:r.city,jurisdictionId:r.jurisdiction_id,establishmentCount:Number(r.n),inspectionCount:Number(r.inspections),firstInspectionDate:r.first,lastInspectionDate:r.last,latitude:r.latitude===null?null:Number(r.latitude),longitude:r.longitude===null?null:Number(r.longitude)}));
  }

  async establishmentBySlug(stateCode, slug) {
    const [row] = await query(this.pool, `SELECT * FROM nf_preview.establishments WHERE ${PUBLISHED} AND state_code=$1 AND slug=$2`, [stateCode.toUpperCase(), slug]);
    if (!row) return null;
    const inspections = await query(this.pool, 'SELECT i.*, f.finished_at AS observed_at FROM nf_preview.inspections i JOIN nf_preview.refresh_runs f ON f.id=i.last_run WHERE i.establishment_id=$1 ORDER BY i.inspection_date DESC, i.id', [row.id]);
    const violations = await query(this.pool, 'SELECT v.* FROM nf_preview.violations v JOIN nf_preview.inspections i ON i.id=v.event_id WHERE i.establishment_id=$1 ORDER BY v.source_id', [row.id]);
    const [jurisdiction] = await query(this.pool, 'SELECT * FROM nf_preview.jurisdictions WHERE id=$1', [row.jurisdiction_id]);
    return {
      ...establishmentRow(row),
      jurisdiction: jurisdiction ? { id: jurisdiction.id, name: jurisdiction.name, healthAuthority: jurisdiction.health_authority, sourceUrl: jurisdiction.source_url, scoring: JSON.parse(jurisdiction.scoring_json), coverageStatus: jurisdiction.coverage_status } : null,
      inspections: inspections.map(r => ({ id: r.id, businessId: r.business_id, serial: r.serial, inspectionDate: r.inspection_date, fields: JSON.parse(r.fields_json), rowCount: Number(r.row_count), observedAt: r.observed_at, stale: stale(r.observed_at), violations: violations.filter(v => v.event_id === r.id).map(v => ({ description: v.description, type: v.type, points: v.points })), sourceUrl: sourceUrl(r.business_id, r.serial, r.jurisdiction_id) })),
    };
  }
  async inspectionDeskHistory({jurisdictionId,stateCode,city='',since='0000-01-01'}) {
    const params=[jurisdictionId,stateCode,since];
    const cityClause=city?`AND ${cityKeySql('e.city','e.state_code')}=$4`:'';
    if(city)params.push(canonicalCityKey(stateCode,city));
    // Filter inspections before aggregating their violations; do not aggregate
    // every jurisdiction's violation table for each city request. Only the three
    // fields used by the desk cross the database boundary.
    const rows=await query(this.pool,`WITH scoped AS MATERIALIZED (
      SELECT e.id,e.name,e.slug,e.city,e.state_code,i.id AS event_id,i.inspection_date,
      json_build_object('inspection_type',(i.fields_json::jsonb)->>'inspection_type',
        'inspection_score',(i.fields_json::jsonb)->>'inspection_score',
        'inspection_closed_business',(i.fields_json::jsonb)->>'inspection_closed_business')::text AS fields_json
      FROM nf_preview.establishments e JOIN nf_preview.inspections i ON i.establishment_id=e.id
      WHERE e.jurisdiction_id=$1 AND e.state_code=$2 AND (i.inspection_date >= $3 OR (i.fields_json::jsonb)->>'inspection_closed_business'='Yes') AND e.${PUBLISHED} ${cityClause}
    ), findings AS (
      SELECT v.event_id,json_agg(json_build_object('description',v.description,'type',v.type,'points',v.points) ORDER BY v.source_id) AS violations
      FROM nf_preview.violations v JOIN scoped s ON s.event_id=v.event_id GROUP BY v.event_id
    ) SELECT s.*,coalesce(v.violations,'[]'::json) AS violations FROM scoped s
      LEFT JOIN findings v ON v.event_id=s.event_id ORDER BY s.id,s.inspection_date DESC,s.event_id`,params);
    const businesses=new Map();
    for(const r of rows){const b=businesses.get(r.id)??{id:r.id,name:r.name,slug:r.slug,city:r.city,stateCode:r.state_code,events:[]};b.events.push({id:r.event_id,date:r.inspection_date,fields:JSON.parse(r.fields_json),violations:r.violations});businesses.set(r.id,b);}
    return [...businesses.values()];
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
        const [prior] = await query(client, 'SELECT raw_json,source_id FROM nf_preview.row_revisions WHERE event_id=$1 ORDER BY first_run DESC LIMIT 1', [id]);
        if (!prior) return null;
        const raw = JSON.parse(prior.raw_json);
        const [run] = await query(client, 'SELECT max(last_run) AS run FROM nf_preview.source_rows WHERE event_id=$1', [id]);
        record = { jurisdiction_id: Object.keys(ADAPTERS).find(id => prior.source_id.startsWith(`${id}:`)) ?? 'wa-king', business_id: raw.business_id, serial: raw.inspection_serial_num, fields_json: fields(raw), last_run: run.run };
      }
      const rows = await query(client, 'SELECT raw_json FROM nf_preview.source_rows WHERE event_id=$1 AND active ORDER BY source_id', [id]);
      const revisions = await query(client, 'SELECT r.source_id,r.hash,r.raw_json,r.first_run,f.finished_at AS observed_at FROM nf_preview.row_revisions r JOIN nf_preview.refresh_runs f ON f.id=r.first_run WHERE event_id=$1 ORDER BY first_run,source_id', [id]);
      const changes = await query(client, 'SELECT * FROM nf_preview.row_changes WHERE source_id IN (SELECT source_id FROM nf_preview.row_revisions WHERE event_id=$1) ORDER BY id', [id]);
      const violations = await query(client, 'SELECT * FROM nf_preview.violations WHERE event_id=$1 ORDER BY source_id', [id]);
      const [observed] = await query(client, 'SELECT finished_at FROM nf_preview.refresh_runs WHERE id=$1', [record.last_run]);
      return { id, active, businessId: record.business_id, serial: record.serial, fields: JSON.parse(record.fields_json), completeEvent: active, rows: rows.map(r => JSON.parse(r.raw_json)),
        violations, revisions: revisions.map(r => ({ ...r, first_run: Number(r.first_run), raw_json: JSON.parse(r.raw_json) })), changes: changes.map(r => ({ ...r, id: Number(r.id), run_id: Number(r.run_id) })), sourceUrl: sourceUrl(record.business_id, record.serial, record.jurisdiction_id), observedAt: observed?.finished_at, stale: stale(observed?.finished_at) };
    });
  }
  async history(businessId, limit, offset) {
    const [coverage] = await query(this.pool, "SELECT finished_at FROM nf_preview.refresh_runs WHERE jurisdiction_id='wa-king' AND status='success' AND (scope->>'type'='all' OR (scope->>'type'='business' AND scope->>'businessId'=$1)) ORDER BY id DESC LIMIT 1", [businessId]);
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
    const snapshot = prepareSnapshot(await source.snapshot(scope), jurisdictionId);
    if (JSON.stringify(snapshot.scope) !== JSON.stringify(scope)) throw new Error('Source scope does not match requested scope');
    return await withTransaction({ connect: async () => ({ query: client.query.bind(client), release(error) { discard = error; } }) }, async tx => {
      const [run] = await query(tx, "INSERT INTO nf_preview.refresh_runs(started_at,status,scope,jurisdiction_id) VALUES($1,'running',$2,$3) RETURNING id", [started, JSON.stringify(scope), jurisdictionId]);
      const bounded = ['latest','window'].includes(scope.type);
      const requestedSources=[...snapshot.rows.map(r=>r.sourceId),...snapshot.protectedSourceIds];
      const all = bounded
        ? await query(tx,`SELECT * FROM nf_preview.source_rows WHERE jurisdiction_id=$1 AND (event_id=ANY($2::text[]) OR source_id=ANY($3::text[])${scope.type==='window'?' OR event_id IN (SELECT id FROM nf_preview.inspections WHERE jurisdiction_id=$1 AND inspection_date >= $4 AND inspection_date < $5)':''})`,scope.type==='window'?[jurisdictionId,[...snapshot.events.keys()],requestedSources,scope.start,scope.end]:[jurisdictionId,[...snapshot.events.keys()],requestedSources])
        : await query(tx, 'SELECT * FROM nf_preview.source_rows WHERE jurisdiction_id=$1', [jurisdictionId]);
      const oldRows = new Map(all.map(r => [r.source_id, r]));
      const protectedEvents = new Set(all.filter(r => snapshot.protectedSourceIds.has(r.source_id)).map(r => r.event_id));
      const seen = new Set(snapshot.rows.map(r => r.sourceId));
      // Imports only ever add/remove rows inside their own jurisdiction.
      const inScope = old => old.jurisdiction_id === jurisdictionId && !protectedEvents.has(old.event_id) && (scope.type === 'all' || (scope.type === 'business' && JSON.parse(old.raw_json).business_id === scope.businessId) || (scope.type==='window'&&JSON.parse(old.raw_json).inspection_date>=scope.start&&JSON.parse(old.raw_json).inspection_date<scope.end) || snapshot.events.has(old.event_id));
      if (scope.type === 'all') {
        await tx.query('UPDATE nf_preview.quarantined_rows SET active=false WHERE jurisdiction_id=$1',[jurisdictionId]);
        await insertBatch(tx,'quarantined_rows',['jurisdiction_id','source_revision','official_row_id','imported_source_id','raw_json','reason','active','first_run'],snapshot.quarantine.map(r=>[jurisdictionId,snapshot.revision,String(r.raw[':id']??r.sourceId),r.sourceId,JSON.stringify(r.raw),r.reason,true,run.id]),'ON CONFLICT(jurisdiction_id,source_revision,official_row_id) DO UPDATE SET active=true');
      }
      if(scope.type==='window'){
        await tx.query(`UPDATE nf_preview.quarantined_rows SET active=false WHERE jurisdiction_id=$1 AND active AND
          (imported_source_id=ANY($2::text[]) OR ((raw_json::jsonb)->>$3 >= $4 AND (raw_json::jsonb)->>$3 < $5))`,[jurisdictionId,[...snapshot.rows.map(r=>r.sourceId.slice(jurisdictionId.length+1)),...snapshot.quarantine.map(r=>r.sourceId)],ADAPTERS[jurisdictionId].config.dateField,scope.start,scope.end]);
        await insertBatch(tx,'quarantined_rows',['jurisdiction_id','source_revision','official_row_id','imported_source_id','raw_json','reason','active','first_run'],snapshot.quarantine.map(r=>[jurisdictionId,snapshot.revision,String(r.raw[':id']??r.sourceId),r.sourceId,JSON.stringify(r.raw),r.reason,true,run.id]),'ON CONFLICT(jurisdiction_id,source_revision,official_row_id) DO UPDATE SET active=true');
      }
      let changed = 0;
      const changes = [], removed = [];
      for (const old of all) {
        if (old.active && inScope(old) && !seen.has(old.source_id)) {
          removed.push(old.source_id);
          changes.push([run.id,old.source_id,'removed',old.hash,null]);
          changed++;
        }
      }
      for (const r of snapshot.rows) {
        const old = oldRows.get(r.sourceId);
        if (old && old.event_id !== r.id && !inScope(old)) throw new Error('Source row moved outside import scope; run full import to reconcile');
        if (!old || old.hash !== r.hash || !old.active) {
          changes.push([run.id, r.sourceId, !old ? 'added' : !old.active ? 'restored' : 'changed', old?.hash ?? null, r.hash]);
          changed++;
        }
      }
      if (removed.length) await tx.query('UPDATE nf_preview.source_rows SET active=false,last_run=$1 WHERE source_id=ANY($2::text[])',[run.id,removed]);
      await insertBatch(tx,'row_changes',['run_id','source_id','action','old_hash','new_hash'],changes);
      await insertBatch(tx,'row_revisions',['source_id','hash','event_id','raw_json','first_run'],snapshot.rows.map(r=>[r.sourceId,r.hash,r.id,r.raw,run.id]),'ON CONFLICT DO NOTHING');
      await insertBatch(tx,'source_rows',['source_id','event_id','hash','raw_json','active','last_run','jurisdiction_id'],snapshot.rows.map(r=>[r.sourceId,r.id,r.hash,r.raw,true,run.id,jurisdictionId]),'ON CONFLICT(source_id) DO UPDATE SET event_id=excluded.event_id,hash=excluded.hash,raw_json=excluded.raw_json,active=true,last_run=excluded.last_run,jurisdiction_id=excluded.jurisdiction_id');
      const affectedBusinesses=bounded?[...new Set([...all.map(r=>JSON.parse(r.raw_json).business_id),...snapshot.rows.map(r=>JSON.parse(r.raw).business_id)])]:[];
      const affectedEvents=bounded?[...new Set([...snapshot.events.keys(),...all.map(r=>r.event_id),...(await query(tx,'SELECT id FROM nf_preview.inspections WHERE jurisdiction_id=$1 AND business_id=ANY($2::text[])',[jurisdictionId,affectedBusinesses])).map(r=>r.id)])]:[];
      const existingSlugs = new Map((await query(tx, `SELECT id,slug FROM nf_preview.establishments WHERE jurisdiction_id=$1${bounded?' AND official_id=ANY($2::text[])':''}`, bounded?[jurisdictionId,affectedBusinesses]:[jurisdictionId])).map(e => [e.id, e.slug]));
      await tx.query(`DELETE FROM nf_preview.violations WHERE source_id IN (SELECT source_id FROM nf_preview.source_rows WHERE jurisdiction_id=$1${bounded?' AND event_id=ANY($2::text[])':''})`, bounded?[jurisdictionId,affectedEvents]:[jurisdictionId]);
      await tx.query(`DELETE FROM nf_preview.inspections WHERE jurisdiction_id=$1${bounded?' AND business_id=ANY($2::text[])':''}`, bounded?[jurisdictionId,affectedBusinesses]:[jurisdictionId]);
      await tx.query(`DELETE FROM nf_preview.establishments WHERE jurisdiction_id=$1${bounded?' AND official_id=ANY($2::text[])':''}`, bounded?[jurisdictionId,affectedBusinesses]:[jurisdictionId]);
      const grouped = new Map(), violations = [];
      for (const r of await query(tx, `SELECT * FROM nf_preview.source_rows WHERE active AND jurisdiction_id=$1${bounded?' AND event_id=ANY($2::text[])':''} ORDER BY source_id`, bounded?[jurisdictionId,affectedEvents]:[jurisdictionId])) {
        const raw = JSON.parse(r.raw_json);
        const g = grouped.get(r.event_id) ?? { row: raw, count: 0, run: Number(r.last_run), jurisdiction: r.jurisdiction_id };
        if (fields(g.row) !== fields(raw)) throw new Error('Conflicting inspection fields in retained snapshot');
        g.count++; g.run = Math.max(g.run, Number(r.last_run)); grouped.set(r.event_id, g);
        if (raw.violation_description || raw.violation_type) violations.push([r.source_id, r.event_id, raw.violation_type ?? null, raw.violation_description ?? null, raw.violation_points ?? null]);
      }
      const establishments = new Map(), searchNames = new Map();
      for (const [, g] of grouped) {
        const adapter = ADAPTERS[g.jurisdiction];
        if (!adapter) throw new Error(`Saved rows reference jurisdiction ${g.jurisdiction} without an adapter`);
        const details = adapter.establishment(g.row);
        const summary = adapter.inspectionSummary(g.row);
        const id = establishmentId(g.jurisdiction, details.officialId);
        const names = searchNames.get(id) ?? new Set();
        for (const name of [g.row.name,g.row.alternate_name]) if(name) names.add(name);
        searchNames.set(id,names);
        const prev = establishments.get(id);
        if (!prev) establishments.set(id, { ...details, id, jurisdiction: g.jurisdiction, stateCode: adapter.stateCode, count: 1, latest: summary, run: g.run });
        else {
          prev.count++; prev.run = Math.max(prev.run, g.run);
          if ((summary.date ?? '') > (prev.latest.date ?? '')) { Object.assign(prev, details); prev.latest = summary; }
        }
      }
      await insertBatch(tx,'violations',['source_id','event_id','type','description','points'],violations);
      await insertBatch(tx,'inspections',['id','business_id','serial','inspection_date','fields_json','row_count','last_run','jurisdiction_id','establishment_id'],[...grouped].map(([id,g])=>[id,g.row.business_id,g.row.inspection_serial_num,g.row.inspection_date,fields(g.row),g.count,g.run,g.jurisdiction,establishmentId(g.jurisdiction,ADAPTERS[g.jurisdiction].establishment(g.row).officialId)]));
      await insertBatch(tx,'establishments',['id','jurisdiction_id','official_id','name','address','city','state_code','zip','latitude','longitude','slug','latest_inspection_date','latest_result','latest_score','inspection_count','last_run','search_text'],[...establishments.values()].map(e=>[e.id,e.jurisdiction,e.officialId,e.name,e.address,e.city,e.stateCode,e.zip,e.latitude,e.longitude,existingSlugs.get(e.id) ?? `${citySlug(e.name).slice(0,100)||'establishment'}-${e.id}`,e.latest.date,e.latest.result,e.latest.score,e.count,e.run,[jurisdictionById(e.jurisdiction)?.stateName,jurisdictionById(e.jurisdiction)?.healthAuthority,...searchNames.get(e.id)].filter(Boolean).join(' ')]));
      await tx.query('UPDATE nf_preview.jurisdictions SET last_synced_at=$1 WHERE id=$2', [now(), jurisdictionId]);
      await tx.query("UPDATE nf_preview.refresh_runs SET finished_at=$1,status='success',source_revision=$2,row_count=$3,changed_count=$4,request_urls=$5,rejected_count=$7,source_row_count=$8 WHERE id=$6", [now(), snapshot.revision, snapshot.rows.length, changed, JSON.stringify(snapshot.urls), run.id, snapshot.quarantine.length, snapshot.sourceRowCount]);
      if(scope.type==='window')await tx.query(`INSERT INTO nf_preview.backfill_windows(jurisdiction_id,source_revision,window_start,window_end,source_row_count,accepted_count,rejected_count,run_id,policy_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(jurisdiction_id,source_revision,window_start,window_end) DO UPDATE
        SET source_row_count=excluded.source_row_count,accepted_count=excluded.accepted_count,rejected_count=excluded.rejected_count,run_id=excluded.run_id,policy_id=excluded.policy_id`,[jurisdictionId,snapshot.revision,scope.start,scope.end,snapshot.sourceRowCount,snapshot.rows.length,snapshot.quarantine.length,run.id,scope.policyId??'legacy']);
      return { runId: Number(run.id), rowCount: snapshot.rows.length, changedCount: changed, scope, revision: snapshot.revision, rejectedCount:snapshot.quarantine.length, sourceRowCount:snapshot.sourceRowCount };
    });
  } catch (error) {
    if (locked) await client.query("INSERT INTO nf_preview.refresh_runs(started_at,finished_at,status,scope,error,jurisdiction_id) VALUES($1,$2,'error',$3,$4,$5)", [started, now(), JSON.stringify(scope), 'Import failed; last committed snapshot retained', jurisdictionId]);
    throw error;
  } finally {
    try { if (locked && !discard) await client.query('SELECT pg_advisory_unlock(78623491)'); }
    catch (error) { discard = error; }
    finally { client.release(discard); }
  }
}
