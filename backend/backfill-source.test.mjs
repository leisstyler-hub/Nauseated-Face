import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {BackfillSource} from './backfill-source.mjs';

const adapter={jurisdictionId:'synthetic',config:{origin:'https://official.example.gov',dataset:'abcd-efgh',dateField:'date',eventFields:['business','event']},normalize:r=>{
  if(!r.name)throw Error('Missing official name');
  return {':id':r[':id'],':original':r,business_id:r.business,inspection_serial_num:r.event,inspection_date:r.date,name:r.name,violation_description:r.finding};
}};
const rows=[{':id':'1',business:'b',event:'e',date:'2026-10-01',name:'Synthetic',finding:'one'},{':id':'2',business:'b',event:'e',date:'2026-10-01',name:'Synthetic',finding:'two'},{':id':'3',business:'c',event:'f',date:'2026-10-02',name:'Other',finding:'three'}];
function official({failOffset,revision=1,data=rows,changeRevision=false}={}){
 const requested=[];let meta=0;
 return {requested,fetcher:async input=>{const u=new URL(input);if(u.pathname.startsWith('/api/views/'))return Response.json({rowsUpdatedAt:changeRevision&&meta++?revision+1:revision});
 if(u.searchParams.get('$select')==='count(*) AS count')return Response.json([{count:String(data.length)}]);
 const offset=Number(u.searchParams.get('$offset'));requested.push(offset);if(offset===failOffset)throw Error('Interrupted official download');
 return Response.json(data.slice(offset,offset+Number(u.searchParams.get('$limit'))));}};
}
test('backfill resumes completed pages after interruption and retains all complete event rows',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nf-backfill-'));
 try{const broken=official({failOffset:2});await assert.rejects(new BackfillSource(adapter,{directory:dir,pageSize:2,...broken,sleep:async()=>{}}).snapshot({type:'all'}),/Interrupted/);
 const healthy=official();const s=await new BackfillSource(adapter,{directory:dir,pageSize:2,...healthy}).snapshot({type:'all'});
 assert.deepEqual(healthy.requested,[2]);assert.equal(s.rows.length,3);assert.equal(s.quarantine.length,0);assert.equal(s.sourceRowCount,3);assert.equal(s.revision,'1');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('one invalid violation quarantines its whole inspection with raw provenance',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nf-backfill-'));
 try{const data=structuredClone(rows);delete data[1].name;const s=await new BackfillSource(adapter,{directory:dir,...official({data})}).snapshot({type:'all'});
 assert.deepEqual(s.rows.map(r=>r[':id']),['3']);assert.deepEqual(s.quarantine.map(r=>r.sourceId),['1','2']);assert.deepEqual(s.quarantine[1].raw,data[1]);assert.match(s.quarantine[0].reason,/Missing official name/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('backfill rejects a changed publisher revision and corrupted checkpoint page',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nf-backfill-'));
 try{await assert.rejects(new BackfillSource(adapter,{directory:dir,...official({changeRevision:true})}).snapshot({type:'all'}),/changed/);
 const source=new BackfillSource(adapter,{directory:dir,...official()});await source.snapshot({type:'all'});
 const manifest=JSON.parse(await readFile(join(source.checkpointDirectory,'manifest.json'),'utf8'));
 await writeFile(join(source.checkpointDirectory,manifest.pages[0].file),'[]');
 await assert.rejects(new BackfillSource(adapter,{directory:dir,...official()}).snapshot({type:'all'}),/checksum/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('conflicting event headers are quarantined, never published as partial inspections',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nf-backfill-'));
 try{const data=structuredClone(rows);data[1].name='Conflicting name';const s=await new BackfillSource(adapter,{directory:dir,...official({data})}).snapshot({type:'all'});assert.equal(s.rows.length,1);assert.equal(s.quarantine.length,2);assert.match(s.quarantine[0].reason,/Conflicting/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('monthly windows constrain official queries and keep independent restart checkpoints',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nf-backfill-'));const filters=[];
 try{const network=official();const fetcher=async url=>{const u=new URL(url);if(u.pathname.includes('/resource/'))filters.push(u.searchParams.get('$where'));return network.fetcher(url);};
 const scope={type:'window',start:'2026-10-01',end:'2026-11-01'};
 const source=new BackfillSource(adapter,{directory:dir,fetcher});const s=await source.snapshot(scope);
 assert.deepEqual(s.scope,scope);assert.ok(filters.every(w=>w==="date >= '2026-10-01T00:00:00.000' AND date < '2026-11-01T00:00:00.000'"));assert.equal(s.rows.length,3);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('future-dated publisher records stay in quarantine with every source row accounted for',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nf-backfill-'));
 try{const data=rows.map(r=>({...r,date:'2031-01-01T00:00:00.000'}));const s=await new BackfillSource(adapter,{directory:dir,...official({data})}).snapshot({type:'all'});assert.equal(s.rows.length,0);assert.equal(s.quarantine.length,3);assert.match(s.quarantine[0].reason,/future/);}
 finally{await rm(dir,{recursive:true,force:true});}
});
test('oversized source requests fail before allocating the archive and direct operators to windows',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nf-backfill-'));let pages=0;
 try{const fetcher=async url=>{const u=new URL(url);if(u.pathname.includes('/api/views/'))return Response.json({rowsUpdatedAt:1});if(u.searchParams.get('$select')==='count(*) AS count')return Response.json([{count:'3619476'}]);pages++;return Response.json([]);};await assert.rejects(new BackfillSource(adapter,{directory:dir,fetcher}).snapshot({type:'all'}),/partition/);assert.equal(pages,0);}
 finally{await rm(dir,{recursive:true,force:true});}
});
