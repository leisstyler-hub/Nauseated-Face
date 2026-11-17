import {createHash} from 'node:crypto';
import {SocrataEventSource} from '../socrata-events.mjs';
const config={origin:'https://data.sfgov.org',dataset:'tvy3-wexg',dateField:'inspection_date',eventFields:[':id'],excludeFuture:true,
 latestWhere:"permit_type NOT LIKE '%MASSAGE%' AND permit_type NOT LIKE '%LAUNDRY%' AND permit_type NOT LIKE '%TOBACCO%' AND permit_type NOT LIKE '%TATTOO%' AND permit_type NOT LIKE '%NURSING%'"};
export const adapter={
 jurisdictionId:'ca-san-francisco',stateCode:'CA',config,
 createSource(options){const source=new SocrataEventSource(config,options);return {snapshot:async scope=>{const s=await source.snapshot(scope);return {...s,rows:s.rows.map(adapter.normalize)};}};},
 normalize(raw){
  if([':id','permit_number','dba','street_address','permit_type'].some(f=>typeof raw[f]!=='string'||!raw[f].trim())||!/^\d{4}-\d{2}-\d{2}T/.test(raw.inspection_date??''))throw Error('San Francisco requires permit, report identity, address, permit type and date');
  if(/MASSAGE|LAUNDRY|TOBACCO|TATTOO|NURSING/i.test(raw.permit_type))throw Error('Not a food facility permit in the official source');
  if(raw.inspection_date.slice(0,10)>new Date().toISOString().slice(0,10))throw Error('San Francisco source inspection date is in the future');
  const business=createHash('sha256').update(JSON.stringify([raw.permit_number,raw.street_address])).digest('hex');
  return {':id':raw[':id'],':original':raw,business_id:business,inspection_serial_num:raw[':id'],inspection_date:raw.inspection_date,name:raw.dba,address:raw.street_address,city:'San Francisco',zip_code:'',inspection_type:raw.inspection_type??'',inspection_result:raw.facility_rating_status??'',latitude:raw.latitude??'',longitude:raw.longitude??'',violation_description:raw.violation_codes??''};
 },
 establishment:r=>({officialId:r.business_id,name:r.name,address:r.address,city:r.city,zip:r.zip_code,latitude:r.latitude?Number(r.latitude):null,longitude:r.longitude?Number(r.longitude):null}),
 inspectionSummary:r=>({date:r.inspection_date,result:r.inspection_result,score:null}),
 recordUrl:(_business,serial)=>`${config.origin}/resource/${config.dataset}.json?${new URLSearchParams({'$where':`:id='${String(serial).replaceAll("'","''")}'`})}`,
};
