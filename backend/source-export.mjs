export async function sourceExportResponse(store,jurisdictionId){
 if(jurisdictionId!=='ca-marin'){await store.close();return Response.json({error:'No licensed export for that source'},{status:400});}
 const client=await store.pool.connect();let closed=false;
 const close=async()=>{if(closed)return;closed=true;try{await client.query('ROLLBACK');}finally{client.release();await store.close();}};
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const source=(await client.query("SELECT * FROM nf_preview.jurisdictions WHERE id=$1 AND enabled AND coverage_status IN ('available','limited')",[jurisdictionId])).rows[0];
  if(!source){await close();return Response.json({error:'Source is not published'},{status:404});}
  async function* lines(){
   try{
    yield {type:'metadata',attribution:'County of Marin, Food Facility Inspections',source:source.source_url,license:'https://opendatacommons.org/licenses/odbl/1-0/',modifications:'Normalized inspection/business fields and exact-key grouping; originals retained under :original. Quarantined records are separately identified. No scores or missing inspections inferred.'};
    let cursor='';
    for(;;){const rows=(await client.query('SELECT source_id,raw_json FROM nf_preview.source_rows WHERE jurisdiction_id=$1 AND active AND source_id>$2 ORDER BY source_id LIMIT 500',[jurisdictionId,cursor])).rows;
     for(const r of rows)yield {type:'record',sourceId:r.source_id,row:JSON.parse(r.raw_json)};
     if(rows.length<500)break;cursor=rows.at(-1).source_id;
    }
    for(let offset=0;;offset+=500){const rows=(await client.query('SELECT raw_json,reason FROM nf_preview.quarantined_rows WHERE jurisdiction_id=$1 AND active ORDER BY source_revision,official_row_id LIMIT 500 OFFSET $2',[jurisdictionId,offset])).rows;
     for(const r of rows)yield {type:'quarantined',raw:JSON.parse(r.raw_json),reason:r.reason};if(rows.length<500)break;
    }
   }finally{await close();}
  }
  const iterator=lines(),encoder=new TextEncoder();
  const stream=new ReadableStream({async pull(controller){try{const next=await iterator.next();if(next.done)controller.close();else controller.enqueue(encoder.encode(JSON.stringify(next.value)+'\n'));}catch(error){await iterator.return();controller.error(error);}},async cancel(){await iterator.return();await close();}});
  return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Content-Disposition':'attachment; filename="marin-inspections-odbl.ndjson"','Cache-Control':'no-store'}});
 }catch(error){await close();throw error;}
}
