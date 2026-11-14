import { Source, SOURCE } from '../source.mjs';

// King County, WA — Socrata open dataset. The original market and the
// reference implementation for the national adapter contract: createSource()
// yields verified raw snapshots; establishment()/inspectionSummary() translate
// native rows into the standardized entities without altering source data.
export const adapter = {
  jurisdictionId: 'wa-king',
  stateCode: 'WA',
  createSource: options => new Source(options),
  establishment(raw) {
    return {
      officialId: raw.business_id,
      name: raw.name || raw.program_identifier || 'Unknown establishment',
      address: raw.address ?? null,
      city: raw.city ?? null,
      zip: raw.zip_code ?? null,
      latitude: Number.isFinite(Number(raw.latitude)) ? Number(raw.latitude) : null,
      longitude: Number.isFinite(Number(raw.longitude)) ? Number(raw.longitude) : null,
    };
  },
  inspectionSummary(raw) {
    return {
      date: raw.inspection_date ?? null,
      result: raw.inspection_result ?? null,
      score: raw.inspection_score ?? null,
    };
  },
  recordUrl: (businessId, serial) => `${SOURCE}?${new URLSearchParams({ business_id: businessId, inspection_serial_num: serial })}`,
};
