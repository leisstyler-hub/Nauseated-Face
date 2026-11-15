import { createHash } from 'node:crypto';
import { SocrataInspectionSource } from '../socrata.mjs';
const config = { origin: 'https://data.cityofchicago.org', dataset: '4ijn-s7e5', dateField: 'inspection_date', idField: 'inspection_id' };
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
export const adapter = {
  jurisdictionId: 'il-chicago', stateCode: 'IL', config,
  createSource(options) {
    const source = new SocrataInspectionSource(config, options);
    return { snapshot: async scope => { const s = await source.snapshot(scope); return { ...s, rows: s.rows.map(row => adapter.normalize(row)) }; } };
  },
  normalize(raw) {
    if (!raw.inspection_id || !raw.license_ || !/^[1-9][0-9]*$/.test(raw.license_) || !raw.address || !raw.dba_name || raw.state !== 'IL' || !/^\d{4}-\d{2}-\d{2}T/.test(raw.inspection_date ?? '')) throw new Error('Chicago record requires valid establishment identity/date/state; review before publication');
    // License + exact address avoids merging separate locations. No fuzzy matches.
    const officialId = createHash('sha256').update(JSON.stringify([raw.license_, raw.address, raw.zip ?? null])).digest('hex');
    return { ':id': raw.inspection_id, ':original': raw, business_id: officialId, inspection_serial_num: raw.inspection_id,
      inspection_date: raw.inspection_date, name: raw.dba_name, alternate_name: raw.aka_name ?? '', address: raw.address,
      city: raw.city ?? '', zip_code: raw.zip ?? '', inspection_type: raw.inspection_type ?? '', inspection_result: raw.results ?? '',
      latitude: raw.latitude ?? '', longitude: raw.longitude ?? '', violation_description: raw.violations ?? '' };
  },
  establishment(raw) {
    return { officialId: raw.business_id, name: raw.name, address: raw.address, city: raw.city, zip: raw.zip_code,
      latitude: raw.latitude ? Number(raw.latitude) : null, longitude: raw.longitude ? Number(raw.longitude) : null };
  },
  inspectionSummary: raw => ({ date: raw.inspection_date, result: raw.inspection_result, score: null }),
  recordUrl: (_business, serial) => `${config.origin}/resource/${config.dataset}.json?${new URLSearchParams({ '$where': `inspection_id=${literal(serial)}` })}`,
};
