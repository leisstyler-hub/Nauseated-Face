import { createHash } from 'node:crypto';
import { SocrataEventSource } from '../socrata-events.mjs';

const config = { origin: 'https://data.cincinnati-oh.gov', dataset: 'rg6p-b3h3', dateField: 'action_date', eventFields: ['recordnum_license','recordnum_insp','action_sequence'] };
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
export const adapter = {
  jurisdictionId: 'oh-cincinnati', stateCode: 'OH', config,
  createSource(options) {
    const source = new SocrataEventSource(config, options);
    return { snapshot: async scope => { const s = await source.snapshot(scope); return { ...s, rows: s.rows.map(row => adapter.normalize(row)) }; } };
  },
  normalize(raw) {
    if ([':id',...config.eventFields,'business_name','address','city','action_status'].some(f => typeof raw[f] !== 'string' || !raw[f].trim()) || raw.state !== 'OH' || !/^\d{4}-\d{2}-\d{2}T/.test(raw.action_date ?? '')) throw new Error('Cincinnati requires valid row/event/business identity, date and result');
    const businessId = createHash('sha256').update(JSON.stringify([raw.recordnum_license,raw.address,raw.postal_code ?? null])).digest('hex');
    return { ':id':raw[':id'], ':original':raw, business_id:businessId,
      inspection_serial_num:JSON.stringify(config.eventFields.map(f=>raw[f])), inspection_date:raw.action_date,
      name:raw.business_name,address:raw.address,city:raw.city,zip_code:raw.postal_code??'',
      inspection_type:[raw.insp_type,raw.insp_subtype].filter(Boolean).join(' / '),inspection_result:raw.action_status,
      latitude:raw.latitude??'',longitude:raw.longitude??'',
      violation_description:[raw.violation_description,raw.violation_comments].filter(Boolean).join('\n'),violation_code:raw.code??'' };
  },
  establishment: raw => ({officialId:raw.business_id,name:raw.name,address:raw.address,city:raw.city,zip:raw.zip_code,latitude:raw.latitude?Number(raw.latitude):null,longitude:raw.longitude?Number(raw.longitude):null}),
  inspectionSummary: raw => ({date:raw.inspection_date,result:raw.inspection_result,score:null}),
  recordUrl: (_business,serial) => {
    const values=JSON.parse(serial);
    return `${config.origin}/resource/${config.dataset}.json?${new URLSearchParams({'$where':config.eventFields.map((f,i)=>`${f}=${literal(values[i])}`).join(' AND ')})}`;
  },
};
