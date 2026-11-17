import {createHash} from 'node:crypto';
import {SocrataEventSource} from '../socrata-events.mjs';
const config={origin:'https://data.delaware.gov',dataset:'384s-wygj',dateField:'insp_date',eventFields:['restname','restaddress','restcity','restzip','insp_date','insp_type'],excludeFuture:true};
const literal=v=>`'${String(v).replaceAll("'","''")}'`;
export const adapter={
 jurisdictionId:'de-state',stateCode:'DE',config,
 createSource(options){const source=new SocrataEventSource(config,options);return {snapshot:async scope=>{const s=await source.snapshot(scope);return {...s,rows:s.rows.map(adapter.normalize)};}};},
 normalize(raw){
  if([':id',...config.eventFields].some(f=>typeof raw[f]!=='string'||!raw[f].trim())||!/^\d{4}-\d{2}-\d{2}T/.test(raw.insp_date))throw Error('Delaware requires exact published establishment/date/type identity');
  const business=createHash('sha256').update(JSON.stringify([raw.restname,raw.restaddress,raw.restcity,raw.restzip])).digest('hex');
  return {':id':raw[':id'],':original':raw,business_id:business,inspection_serial_num:JSON.stringify(config.eventFields.map(f=>raw[f])),inspection_date:raw.insp_date,name:raw.restname,address:raw.restaddress,city:raw.restcity,zip_code:raw.restzip,inspection_type:raw.insp_type,inspection_result:'',latitude:raw.geocoded_column?.latitude??'',longitude:raw.geocoded_column?.longitude??'',violation_code:raw.violation??'',violation_description:raw.vio_desc??''};
 },
 establishment:r=>({officialId:r.business_id,name:r.name,address:r.address,city:r.city,zip:r.zip_code,latitude:r.latitude?Number(r.latitude):null,longitude:r.longitude?Number(r.longitude):null}),
 inspectionSummary:r=>({date:r.inspection_date,result:r.inspection_result,score:null}),
 recordUrl:(_business,serial)=>{const values=JSON.parse(serial);return `${config.origin}/resource/${config.dataset}.json?${new URLSearchParams({'$where':config.eventFields.map((f,i)=>`${f}=${literal(values[i])}`).join(' AND ')})}`;},
};
