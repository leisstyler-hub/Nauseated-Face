import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADAPTERS } from './adapters/index.mjs';
import { prepareSnapshot } from './postgres-pilot.mjs';

test('Cincinnati groups violation rows by official inspection action without manufacturing scores', () => {
  const adapter = ADAPTERS['oh-cincinnati'];
  assert.ok(adapter, 'Cincinnati adapter is required');
  const native = { ':id': 'row-a', recordnum_license: 'permit-1', recordnum_insp: 'inspection-1', action_sequence: '10', business_name: 'Fixture', address: '1 Example St', city: 'CINCINNATI', state: 'OH', postal_code: '45219', action_date: '2026-11-01T00:00:00.000', insp_type: 'ROUTINE', insp_subtype: 'STANDARD INSPECTION', action_status: 'Approved - Minor Violations', code: '4.8', violation_description: 'Official description', violation_comments: 'Exact notes' };
  const one = adapter.normalize(native), two = adapter.normalize({ ...native, ':id': 'row-b', code: '5.1', violation_description: 'Second description' });
  assert.deepEqual(one[':original'], native);
  assert.match(one.violation_description, /Exact notes/);
  assert.equal(one.inspection_score, undefined);
  assert.equal(prepareSnapshot({ rows: [one,two], scope: {type:'all'} }, adapter.jurisdictionId).events.size, 1);
  const otherAction = adapter.normalize({ ...native, action_sequence: '11' });
  assert.notEqual(otherAction.inspection_serial_num, one.inspection_serial_num);
  assert.throws(() => adapter.normalize({ ...native, state: 'KY' }), /identity/);
});

test('NYC keeps official score, grade and critical flag with stable compound inspection identity', () => {
  const adapter = ADAPTERS['ny-nyc'];
  assert.ok(adapter, 'NYC adapter is required');
  const native = { ':id':'row-a', camis:'12345678', dba:'Fixture', boro:'Brooklyn', building:'12', street:'EXAMPLE STREET', zipcode:'11220', inspection_date:'2026-11-01T00:00:00.000', inspection_type:'Cycle Inspection / Initial Inspection', action:'Violations were cited in the following area(s).', score:'13', grade:'A', violation_code:'04A', violation_description:'Official description', critical_flag:'Critical' };
  const one = adapter.normalize(native), two = adapter.normalize({ ...native, ':id':'row-b', violation_code:'06A', violation_description:'Second finding', critical_flag:'Not Critical' });
  assert.deepEqual(one[':original'],native);
  assert.equal(one.inspection_score,'13');
  assert.equal(one.inspection_grade,'A');
  assert.equal(one.violation_type,'Critical');
  assert.equal(one.city,'New York City');
  assert.equal(prepareSnapshot({rows:[one,two],scope:{type:'all'}},adapter.jurisdictionId).events.size,1);
  assert.notEqual(adapter.normalize({...native,inspection_type:'Cycle Inspection / Re-inspection'}).inspection_serial_num,one.inspection_serial_num);
  assert.throws(()=>adapter.normalize({...native,inspection_date:'1900-01-01T00:00:00.000'}),/date/);
});

test('Austin source preserves higher-is-better score and municipality stated in the official address',()=>{
 const adapter=ADAPTERS['tx-austin'];assert.ok(adapter,'Austin adapter is required');
 const native={inspectionid:'12',facility_id:'34',restaurant_name:'Fixture',address:'12 Example Rd West Lake Hills, TX 78746',inspection_date:'2026-11-01T00:00:00.000',score:'92.000000',process_description:'Routine Inspection',inspectionscorecategory:'90+ (Green)'};
 const row=adapter.normalize(native);
 assert.equal(row.city,'West Lake Hills');assert.equal(row.inspection_score,'92.000000');assert.deepEqual(row[':original'],native);
 assert.equal(adapter.normalize({...native,address:'12 Example Dr Austin, TX 78753-6507'}).city,'Austin');
 assert.throws(()=>adapter.normalize({...native,address:'12 Example Road'}),/municipality/);
 assert.throws(()=>adapter.normalize({...native,score:'101'}),/score/);
});
