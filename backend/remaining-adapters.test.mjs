import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ADAPTERS} from './adapters/index.mjs';
import {prepareSnapshot} from './postgres-pilot.mjs';

test('Delaware groups the publisher-defined establishment/date/type without invented grades or passes',()=>{
 const a=ADAPTERS['de-state'];assert.ok(a);
 const raw={':id':'row-1',restname:'Synthetic',restaddress:'1 Example St',restcity:'Dover',restzip:'19901',insp_date:'2026-10-01T00:00:00.000',insp_type:'Routine',violation:'1',vio_desc:'Exact official finding'};
 const one=a.normalize(raw),two=a.normalize({...raw,':id':'row-2',violation:'2',vio_desc:'Other finding'});
 assert.deepEqual(one[':original'],raw);assert.equal(one.inspection_score,undefined);assert.equal(one.inspection_result,'');assert.equal(prepareSnapshot({rows:[one,two],scope:{type:'all'}},a.jurisdictionId).events.size,1);
 assert.notEqual(a.normalize({...raw,restaddress:'2 Example St'}).business_id,one.business_id);
});
test('San Francisco treats each published complete report as a distinct source record and rejects future dates',()=>{
 const a=ADAPTERS['ca-san-francisco'];assert.ok(a);
 const raw={':id':'row-1',permit_number:'123',permit_type:'H24 - RESTAURANT UNDER 1,000 SQFT',inspection_date:'2026-10-01T00:00:00.000',dba:'Synthetic',street_address:'1 Example St',facility_rating_status:'Conditional Pass',violation_codes:'Exact official narrative'};
 const r=a.normalize(raw);assert.deepEqual(r[':original'],raw);assert.equal(r.inspection_result,'Conditional Pass');assert.equal(r.inspection_score,undefined);assert.equal(r.violation_description,'Exact official narrative');
 assert.notEqual(a.normalize({...raw,':id':'row-2'}).inspection_serial_num,r.inspection_serial_num);
 assert.throws(()=>a.normalize({...raw,inspection_date:'2031-01-01T00:00:00.000'}),/future/);
 assert.throws(()=>a.normalize({...raw,permit_type:'H67 - MASSAGE ESTABLISHMENT'}),/food facility/);
 assert.equal(a.normalize({...raw,facility_rating_status:undefined}).inspection_result,'');
});
test('Marin retains official placard and violation corrections while grouping by inspection ID',()=>{
 const a=ADAPTERS['ca-marin'];assert.ok(a);
 const raw={':id':'row-1',business_id:'123',inspection_id:'456',business_name:'"Synthetic"',license_number:'L123',formatted_address:'"1 Example St, NOVATO, CA 94949"',business_city:'"NOVATO"',business_postal_code:'94949',inspection_date:'2026-10-01T13:00:00.000',inspection_type:'Routine',inspection_result:'VIOLFOUND',inspection_description:'"Violation(s) Found"',placard:'GREEN',violation_description:'Exact finding',corrected_on_site:'Yes',is_major_violation:'yes'};
 const r=a.normalize(raw);assert.deepEqual(r[':original'],raw);assert.equal(r.name,'"Synthetic"');assert.equal(r.city,'NOVATO');assert.equal(r.inspection_result,'VIOLFOUND');assert.equal(r.inspection_placard,'GREEN');assert.match(r.violation_description,/Corrected on site: Yes/);
 assert.equal(prepareSnapshot({rows:[r,a.normalize({...raw,':id':'row-2',violation_description:'Other',corrected_on_site:'No'})],scope:{type:'all'}},a.jurisdictionId).events.size,1);
});
