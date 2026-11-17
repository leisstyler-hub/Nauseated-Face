import {createHash, randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile, rename} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {Source} from './source.mjs';
import {prepareSnapshot} from './postgres-pilot.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
async function atomic(path, value) {
  const pending = `${path}.${randomUUID()}.pending`;
  await writeFile(pending, value, {flag:'wx'});
  await rename(pending, path);
}

// Operator-only complete-source collection. Raw pages survive network failures;
// they are reusable only for the same publisher revision, query and page size.
export class BackfillSource extends Source {
  constructor(adapter, {directory, onPage=()=>{}, ...options}={}) {
    super(options); this.adapter=adapter; this.directory=directory; this.onPage=onPage;
  }
  async snapshot(scope) {
    if(!['all','window'].includes(scope?.type)||!this.directory)throw Error('Backfill requires all/window scope and an explicit checkpoint directory');
    const {origin,dataset,eventFields,idField,dateField}=this.adapter.config??{};
    if(!/^https:\/\/[a-z0-9.-]+$/.test(origin)||!/^[a-z0-9]{4}-[a-z0-9]{4}$/.test(dataset)||
       !Number.isInteger(this.pageSize)||this.pageSize<1||this.pageSize>10000)throw Error('Invalid backfill configuration');
    const identityFields=eventFields??[idField];
    if(!identityFields.length||identityFields.some(f=>!/^[:a-z_][a-z0-9_]*$/.test(f??'')))throw Error('Invalid event identity configuration');
    const metadata=`${origin}/api/views/${dataset}.json`;
    const before=await this.json(metadata);
    if(!Number.isSafeInteger(before.rowsUpdatedAt)||before.rowsUpdatedAt<0)throw Error('Missing source revision');
    const urls=[metadata];
    let where;
    if(scope.type==='window'){
      if(!/^[a-z_][a-z0-9_]*$/.test(dateField)||![scope.start,scope.end].every(v=>/^\d{4}-\d{2}-\d{2}$/.test(v??'')&&new Date(v).toISOString().slice(0,10)===v)||scope.start>=scope.end)throw Error('Invalid date window');
      where=`${dateField} >= '${scope.start}T00:00:00.000' AND ${dateField} < '${scope.end}T00:00:00.000'`;
    }
    const get=async params=>{const url=`${origin}/resource/${dataset}.json?${new URLSearchParams({...params,...(where?{'$where':where}:{})})}`;urls.push(url);return this.json(url);};
    const counts=await get({'$select':'count(*) AS count'});
    const count=Number(counts?.[0]?.count);
    if(!Array.isArray(counts)||counts.length!==1||!/^\d+$/.test(String(counts[0]?.count))||!Number.isSafeInteger(count)||(count<1&&scope.type==='all'))throw Error('Invalid or empty official source count');
    if(count>500000)throw Error('Source partition exceeds 500000 rows; use smaller date partitions');
    const identity={origin,dataset,revision:String(before.rowsUpdatedAt),pageSize:this.pageSize,count,order:':id',...(where?{where}:{})};
    this.checkpointDirectory=join(resolve(this.directory),hash(JSON.stringify(identity)));
    await mkdir(this.checkpointDirectory,{recursive:true});
    const manifestPath=join(this.checkpointDirectory,'manifest.json');
    let manifest;
    try{manifest=JSON.parse(await readFile(manifestPath,'utf8'));}
    catch(error){if(error.code!=='ENOENT')throw error;manifest={identity,pages:[]};}
    if(JSON.stringify(manifest.identity)!==JSON.stringify(identity)||!Array.isArray(manifest.pages))throw Error('Checkpoint identity mismatch');
    const raw=[],seen=new Set();
    for(let offset=0,index=0;offset<count;offset+=this.pageSize,index++){
      const limit=Math.min(this.pageSize,count-offset),file=`${index}.json`;
      const entry=manifest.pages[index];let page;
      if(entry){
        if(entry.file!==file||entry.offset!==offset||entry.count!==limit)throw Error('Checkpoint page mismatch');
        const bytes=await readFile(join(this.checkpointDirectory,file),'utf8');
        if(hash(bytes)!==entry.hash)throw Error('Checkpoint checksum mismatch');
        page=JSON.parse(bytes);
      }else{
        page=await get({'$select':'*, :id','$order':':id','$limit':String(limit),'$offset':String(offset)});
      }
      if(!Array.isArray(page)||page.length!==limit)throw Error('Incomplete official backfill page');
      for(const row of page){if(typeof row[':id']!=='string'||!row[':id']||seen.has(row[':id']))throw Error('Missing or duplicate source row identity');if(where&&!(row[dateField]>=scope.start&&row[dateField]<scope.end))throw Error('Source row outside requested date window');seen.add(row[':id']);}
      if(!entry){
        const bytes=JSON.stringify(page);await atomic(join(this.checkpointDirectory,file),bytes);
        manifest.pages.push({file,offset,count:page.length,hash:hash(bytes)});
        await atomic(manifestPath,JSON.stringify(manifest));
      }
      raw.push(...page);await this.onPage({jurisdictionId:this.adapter.jurisdictionId,collected:raw.length,total:count,resumed:!!entry});
    }
    const after=await this.json(metadata);
    if(after.rowsUpdatedAt!==before.rowsUpdatedAt)throw Error('Source dataset changed during backfill; collect the new revision');
    const groups=new Map();
    for(const row of raw){
      const complete=identityFields.every(f=>typeof row[f]==='string'&&row[f].trim());
      const key=complete?JSON.stringify(identityFields.map(f=>row[f])):JSON.stringify(['unresolved-row',row[':id']]);
      const group=groups.get(key)??[];group.push(row);groups.set(key,group);
    }
    const rows=[],quarantine=[],normalizedIds=new Set();
    for(const group of groups.values()){
      try{
        if(identityFields.some(f=>typeof group[0][f]!=='string'||!group[0][f].trim()))throw Error('Missing official event identity');
        const normalized=group.map(row=>this.adapter.normalize(row));
        if(normalized.some(row=>row.inspection_date.slice(0,10)>new Date().toISOString().slice(0,10)))throw Error('Official inspection date is in the future');
        const prepared=prepareSnapshot({rows:normalized,scope,revision:identity.revision,urls:[]},this.adapter.jurisdictionId);
        if(prepared.events.size!==1)throw Error('Official event split into conflicting identities');
        if(normalized.some(row=>normalizedIds.has(row[':id'])))throw Error('Duplicate normalized source row identity');
        normalized.forEach(row=>normalizedIds.add(row[':id']));rows.push(...normalized);
      }catch(error){
        for(const row of group)quarantine.push({sourceId:String(row[idField]??row[':id']),raw:row,reason:error.message});
      }
    }
    if(rows.length+quarantine.length!==count)throw Error('Backfill accounting mismatch');
    return {rows,scope,revision:identity.revision,urls,sourceRowCount:count,quarantine};
  }
}
