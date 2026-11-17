import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SocrataEventSource} from './socrata-events.mjs';
const config={origin:'https://example.gov',dataset:'abcd-1234',dateField:'date',eventFields:['business','event']};
const rows=[{':id':'r1',business:'b',event:'e',date:'2026-01-01'},{':id':'r2',business:'b',event:'e',date:'2026-01-01'}];
function source({revisionChange=false,duplicate=false,missing=false,outside=false}={}) {
 let meta=0;
 return new SocrataEventSource(config,{pageSize:1,fetcher:async url=>{
  const u=new URL(url);
  if(u.pathname.includes('/api/views/'))return Response.json({rowsUpdatedAt:revisionChange?++meta:1});
  if(u.searchParams.has('$group'))return Response.json([{business:'b',event:'e'}]);
  if(u.searchParams.get('$select')==='count(*) AS count')return Response.json([{count:'2'}]);
  const offset=Number(u.searchParams.get('$offset'));
  return Response.json(missing?[]:[outside?{...rows[offset],event:'other'}:duplicate?rows[0]:rows[offset]]);
 }});
}
test('event collector rejects missing rows, duplicate system identities, scope leaks and changing revisions',async()=>{
 await assert.rejects(source({missing:true}).snapshot({type:'all'}),/Incomplete/);
 await assert.rejects(source({duplicate:true}).snapshot({type:'all'}),/duplicate source row/);
 await assert.rejects(source({outside:true}).snapshot({type:'latest',limit:1}),/outside/);
 await assert.rejects(source({revisionChange:true}).snapshot({type:'all'}),/changed/);
});
test('event collector full source retains all original rows and revision',async()=>{
 const snapshot=await source().snapshot({type:'all'});
 assert.deepEqual(snapshot.rows,rows);
 assert.equal(snapshot.revision,'1');
});
test('latest events select dated inspections instead of undated legacy records',async()=>{
 const s=source();const fetcher=s.fetcher;
 s.fetcher=async url=>{const u=new URL(url);if(u.searchParams.has('$group')&&u.searchParams.get('$where')!=='date IS NOT NULL')return Response.json([{business:'legacy'}]);return fetcher(url);};
 assert.equal((await s.snapshot({type:'latest',limit:1})).rows.length,2);
});
