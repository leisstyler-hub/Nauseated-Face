import { SocrataEventSource } from '../socrata-events.mjs';

const config = { origin:'https://data.cityofnewyork.us',dataset:'43nn-pn8j',dateField:'inspection_date',eventFields:['camis','inspection_date','inspection_type'] };
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
export const adapter = {
  jurisdictionId:'ny-nyc',stateCode:'NY',config,
  createSource(options) {
    const source=new SocrataEventSource(config,options);
    return {snapshot:async scope=>{const s=await source.snapshot(scope);return {...s,rows:s.rows.map(row=>adapter.normalize(row))};}};
  },
  normalize(raw) {
    if ([':id','camis','dba','building','street','boro','inspection_type','action'].some(f=>typeof raw[f]!=='string'||!raw[f].trim()) || !/^\d{4}-\d{2}-\d{2}T/.test(raw.inspection_date??'') || raw.inspection_date.slice(0,10)<='1900-01-01') throw new Error('NYC requires valid business/event identity and inspected date');
    if(raw.score!==undefined&&(!/^\d+$/.test(raw.score)||!Number.isSafeInteger(Number(raw.score))))throw new Error('Unknown NYC native score');
    return {':id':raw[':id'],':original':raw,business_id:raw.camis,inspection_serial_num:JSON.stringify(config.eventFields.map(f=>raw[f])),
      inspection_date:raw.inspection_date,name:raw.dba,address:`${raw.building} ${raw.street}`,city:'New York City',zip_code:raw.zipcode??'',
      inspection_type:raw.inspection_type,inspection_result:raw.action,inspection_score:raw.score??'',inspection_grade:raw.grade??'',
      latitude:raw.latitude??'',longitude:raw.longitude??'',violation_description:raw.violation_description??'',violation_type:raw.critical_flag??'',violation_code:raw.violation_code??''};
  },
  establishment:raw=>({officialId:raw.business_id,name:raw.name,address:raw.address,city:raw.city,zip:raw.zip_code,latitude:raw.latitude?Number(raw.latitude):null,longitude:raw.longitude?Number(raw.longitude):null}),
  inspectionSummary:raw=>({date:raw.inspection_date,result:raw.inspection_result,score:raw.inspection_score||null}),
  recordUrl:(_business,serial)=>{const values=JSON.parse(serial);return `${config.origin}/resource/${config.dataset}.json?${new URLSearchParams({'$where':config.eventFields.map((f,i)=>`${f}=${literal(values[i])}`).join(' AND ')})}`;},
};
