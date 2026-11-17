import { createHash } from 'node:crypto';
import { SocrataEventSource } from '../socrata-events.mjs';

const config = { origin: 'https://data.montgomerycountymd.gov', dataset: 'dkrp-gr48', dateField: 'inspection_start_date', eventFields: ['registration_number', 'inspection_number'] };
// Publisher checklist fields. These are not individual narrative violations or scores.
export const CHECKS = ['food_from_approved_source', 'food_protected_from_contamination', 'workers_restricted', 'proper_hand_washing', 'cooling_time_and_temperature', 'cold_holding_temperature', 'hot_holding_temperature', 'cooking_time_and_temperature', 'reheating_time_and_temperature', 'hot_and_cold_running_water_provided', 'proper_sewage_disposal', 'toxic_substances_and_pesticides', 'rodents_and_insects', 'nutritional_labeling', 'trans_fat_ban', 'nosmoking_sign_posted'];
export const adapter = {
  jurisdictionId: 'md-montgomery', stateCode: 'MD', config,
  createSource(options) {
    const source = new SocrataEventSource(config, options);
    return { snapshot: async scope => { const snapshot = await source.snapshot(scope); return { ...snapshot, rows: snapshot.rows.map(row => adapter.normalize(row)) }; } };
  },
  normalize(raw) {
    if (!raw.registration_number?.trim() || !raw.inspection_number?.trim() || !raw.business_name?.trim() || !raw.address?.trim() || !raw.city?.trim() || raw.state !== 'MD' || !/^\d{4}-\d{2}-\d{2}T/.test(raw.inspection_start_date ?? '') || !raw.status?.trim()) throw new Error('Montgomery record requires valid establishment identity/date/state/result; review before publication');
    if (!CHECKS.some(field => Object.hasOwn(raw, field)) || CHECKS.some(field => raw[field] !== undefined && !['In Compliance', 'Not In Compliance', 'Not In Compliance Repeat Violation', 'Corrected Onsite', 'Not Observed', 'Not Applicable'].includes(raw[field]))) throw new Error('Missing or unknown Montgomery checklist status; review before publication');
    const officialId = createHash('sha256').update(JSON.stringify([raw.registration_number, raw.address, raw.zip ?? null])).digest('hex');
    const coordinates = raw.location?.type === 'Point' && Array.isArray(raw.location.coordinates) ? raw.location.coordinates : [];
    return { ':id': raw[':id'] ?? raw.inspection_number, ':original': raw, business_id: officialId, inspection_serial_num: raw.inspection_number,
      inspection_date: raw.inspection_start_date, name: raw.business_name, address: raw.address, city: raw.city.replace(/\s+/g, ' ').trim(), zip_code: raw.zip ?? '',
      inspection_type: raw.inspection_type ?? '', inspection_result: raw.status,
      latitude: Number.isFinite(coordinates[1]) && Math.abs(coordinates[1]) <= 90 ? String(coordinates[1]) : '', longitude: Number.isFinite(coordinates[0]) && Math.abs(coordinates[0]) <= 180 ? String(coordinates[0]) : '',
      // Preserve original field names and exact values; do not infer severity or points.
      violation_description: CHECKS.filter(field => ['Not In Compliance', 'Not In Compliance Repeat Violation', 'Corrected Onsite'].includes(raw[field])).map(field => `${field}: ${raw[field]}`).join('\n') };
  },
  establishment: raw => ({ officialId: raw.business_id, name: raw.name, address: raw.address, city: raw.city, zip: raw.zip_code, latitude: raw.latitude ? Number(raw.latitude) : null, longitude: raw.longitude ? Number(raw.longitude) : null }),
  inspectionSummary: raw => ({ date: raw.inspection_date, result: raw.inspection_result, score: null }),
  recordUrl: (_business, serial) => `${config.origin}/resource/${config.dataset}.json?${new URLSearchParams({ '$where': `inspection_number='${String(serial).replaceAll("'", "''")}'` })}`,
};
