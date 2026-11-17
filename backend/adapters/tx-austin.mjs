import { SocrataInspectionSource } from '../socrata.mjs';

const config={origin:'https://data.austintexas.gov',dataset:'ecmv-9xxi',dateField:'inspection_date',idField:'inspectionid'};
// Match only explicit municipality suffixes in the source address. Never infer
// Austin from the publishing authority or latitude/longitude.
const cities=['West Lake Hills','Sunset Valley','Rollingwood','Pflugerville','Bee Cave','Lakeway','Manor','Austin'];
export const adapter={
 jurisdictionId:'tx-austin',stateCode:'TX',config,
 createSource(options){const source=new SocrataInspectionSource(config,options);return{snapshot:async scope=>{const s=await source.snapshot(scope);return{...s,rows:s.rows.map(row=>adapter.normalize(row))};}};},
 normalize(raw){
  if(['inspectionid','facility_id','restaurant_name','address','process_description'].some(f=>typeof raw[f]!=='string'||!raw[f].trim())||!/^\d{4}-\d{2}-\d{2}T/.test(raw.inspection_date??''))throw new Error('Austin source requires valid business/inspection identity and date');
  const city=cities.find(name=>new RegExp(`\\s${name},?\\s+TX\\s+\\d{5}(?:-\\d{4})?$`,'i').test(raw.address.trim()));
  if(!city)throw new Error('Unverified Austin-source municipality in official address');
  if(typeof raw.score!=='string'||!/^\d+(?:\.\d+)?$/.test(raw.score)||Number(raw.score)<0||Number(raw.score)>100)throw new Error('Unknown Austin native score');
  return{':id':raw.inspectionid,':original':raw,business_id:raw.facility_id,inspection_serial_num:raw.inspectionid,
   inspection_date:raw.inspection_date,name:raw.restaurant_name,address:raw.address,city,zip_code:raw.zip_code??raw.address.match(/\d{5}(?:-\d{4})?$/)?.[0]??'',
   inspection_type:raw.process_description,inspection_result:raw.inspectionscorecategory??'',inspection_score:raw.score,latitude:raw.lat??'',longitude:raw.lng??''};
 },
 establishment:raw=>({officialId:raw.business_id,name:raw.name,address:raw.address,city:raw.city,zip:raw.zip_code,latitude:raw.latitude?Number(raw.latitude):null,longitude:raw.longitude?Number(raw.longitude):null}),
 inspectionSummary:raw=>({date:raw.inspection_date,result:raw.inspection_result,score:raw.inspection_score}),
 recordUrl:(_business,serial)=>`${config.origin}/resource/${config.dataset}.json?${new URLSearchParams({'$where':`inspectionid='${String(serial).replaceAll("'","''")}'`})}`,
};
