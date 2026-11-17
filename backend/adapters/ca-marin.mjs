import {createHash} from 'node:crypto';
import {SocrataEventSource} from '../socrata-events.mjs';
const config={origin:'https://data.marincounty.gov',dataset:'73zb-z5me',dateField:'inspection_date',eventFields:['business_id','inspection_id']};
const unquote=v=>v?.startsWith('"')&&v.endsWith('"')?v.slice(1,-1):v;
export const adapter={
 jurisdictionId:'ca-marin',stateCode:'CA',config,
 createSource(options){const source=new SocrataEventSource(config,options);return {snapshot:async scope=>{const s=await source.snapshot(scope);return {...s,rows:s.rows.map(adapter.normalize)};}};},
 normalize(raw){
  if([':id','business_id','inspection_id','business_name','license_number','formatted_address','business_city','inspection_result'].some(f=>typeof raw[f]!=='string'||!raw[f].trim())||!/^\d{4}-\d{2}-\d{2}T/.test(raw.inspection_date??''))throw Error('Marin requires official business/inspection identity, address, result and date');
  const business=createHash('sha256').update(JSON.stringify([raw.business_id,raw.license_number,raw.formatted_address])).digest('hex');
  return {':id':raw[':id'],':original':raw,business_id:business,inspection_serial_num:raw.inspection_id,inspection_date:raw.inspection_date,name:raw.business_name,address:raw.formatted_address,city:unquote(raw.business_city),zip_code:raw.business_postal_code??'',inspection_type:raw.inspection_type??'',inspection_result:raw.inspection_result,inspection_placard:raw.placard??'',latitude:raw.businessaddress?.latitude??'',longitude:raw.businessaddress?.longitude??'',violation_type:raw.is_major_violation??'',violation_code:raw.violation_code??'',violation_description:[raw.violation_description,raw.violation_description&&raw.corrected_on_site?`Corrected on site: ${raw.corrected_on_site}`:null].filter(Boolean).join('\n')};
 },
 establishment:r=>({officialId:r.business_id,name:r.name,address:r.address,city:r.city,zip:r.zip_code,latitude:r.latitude?Number(r.latitude):null,longitude:r.longitude?Number(r.longitude):null}),
 inspectionSummary:r=>({date:r.inspection_date,result:r.inspection_result,score:null}),
 recordUrl:(_business,serial)=>`${config.origin}/resource/${config.dataset}.json?${new URLSearchParams({'$where':`inspection_id='${String(serial).replaceAll("'","''")}'`})}`,
};
