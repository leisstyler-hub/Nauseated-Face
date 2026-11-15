import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildInspectionDesk} from './inspection-desk.mjs';
const event=(date,score,extra={})=>({date,fields:{inspection_type:'Routine Inspection/Field Review',inspection_score:score},violations:[],...extra});
const business=(id,events)=>({id,name:id,slug:id,stateCode:'WA',city:'Seattle',events});
const report=(businesses,strategy='king_county_points')=>buildInspectionDesk(businesses,{strategy,today:'2026-11-15'});
test('monthly windows, routine-only comparable come backs, one business each',()=>{
 const r=report([business('a',[event('2026-10-20','40'),event('2026-11-10','5'),event('2026-11-12','0',{fields:{inspection_type:'Educational Inspection',inspection_score:'0'}})]),business('b',[event('2026-09-01','50'),event('2026-11-01','')])]);
 assert.equal(r.categories[0].items.length,1);assert.equal(r.categories[0].items[0].score,40);
 const c=r.categories.find(c=>c.id==='comebacks');assert.equal(c.items.length,1);assert.equal(c.items[0].change,35);assert.equal(c.items[0].date,'2026-11-10');assert.match(c.period,/2026-10-17.*2026-11-15/);
});
test('repeat findings require same official code on distinct dates, clean plate needs two scores',()=>{
 const v=description=>({description,type:'RED',points:'5'});
 const r=report([business('a',[event('2026-08-01','5',{violations:[v('0200 - old wording')]}),event('2026-10-01','5',{violations:[v('0200 - revised wording'),v('0200 - revised wording')]})]),business('single',[event('2026-11-01','0')])]);
 assert.equal(r.categories.find(c=>c.id==='repeats').items[0].count,1);assert.equal(r.categories.find(c=>c.id==='clean').items.length,1);assert.equal(r.categories.find(c=>c.id==='red').items.length,1);
});
test('closure flags stay historical without inferred reopening',()=>{
 const r=report([business('a',[event('2026-10-01','100',{fields:{inspection_closed_business:'Yes'}}),event('2026-11-01','0')])]);assert.equal(r.categories.find(c=>c.id==='closures').items[0].status,'Current status unverified');
});
test('unsupported authorities never get invented numeric categories',()=>assert.equal(report([],null).supported,false));
test('same-day visits and non-routine zeros cannot earn awards',()=>{
 const r=report([business('a',[event('2026-11-01','0'),event('2026-11-01','0')]),business('b',[event('2026-10-01','80'),event('2026-11-01','0',{fields:{inspection_type:'Return Inspection',inspection_score:'0'}})])]);assert.equal(r.categories.find(c=>c.id==='clean').items.length,0);assert.equal(r.categories.find(c=>c.id==='comebacks').items.length,0);
});

test('future and stale records do not earn recent awards; missing scores are not skipped',()=>{
 const r=report([business('future',[event('2026-11-16','0'),event('2026-10-20','30')]),business('old',[event('2023-01-01','0'),event('2023-06-01','0')]),business('missing',[event('2026-11-01','0'),event('2026-10-20',null),event('2026-10-01','40')])]);
 assert.equal(r.categories.find(c=>c.id==='comebacks').items.length,0);assert.equal(r.categories.find(c=>c.id==='clean').items.length,0);
});
test('a routine with a later educational or return visit keeps the routine history intact',()=>{
 const r=report([business('a',[event('2026-09-01','50'),event('2026-10-20','20'),event('2026-11-01','0',{fields:{inspection_type:'Return Inspection',inspection_score:'0'}})])]);assert.equal(r.categories.find(c=>c.id==='comebacks').items[0].score,20);
});

test('evidence lists paginate without truncating eligibility; awards remain capped',()=>{
 const entries=Array.from({length:80},(_,i)=>business('business-'+String(i).padStart(3,'0'),[event('2026-10-01','20',{violations:[{description:'0200 - example',type:'RED'}]}),event('2026-11-01','10',{violations:[{description:'0200 - example',type:'RED'}]})]));
 const second=buildInspectionDesk(entries,{strategy:'king_county_points',today:'2026-11-15',offset:50});assert.equal(second.categories.find(c=>c.id==='red').items.length,30);assert.equal(second.categories.find(c=>c.id==='red').total,80);assert.equal(second.categories.find(c=>c.id==='comebacks').items.length,10);
});
test('closure findings older than trend window are retained as dated history',()=>{
 const r=report([business('a',[event('2021-01-01','100',{fields:{inspection_closed_business:'Yes'}})])]);assert.equal(r.categories.find(c=>c.id==='closures').total,1);
});

test('repeat codes count the complete current routine streak beyond two years',()=>{
 const v=code=>({description:code+' - finding',type:'BLUE'});
 const visits=['2023-01-01','2024-06-14','2025-03-20','2025-08-21','2026-05-21'].map((date,i)=>event(date,'5',{violations:[v(i===0?'9999':'3200')]}));
 const item=report([business('pho',visits)]).categories.find(c=>c.id==='repeats').items[0];
 assert.equal(item.longestStreak,4);assert.deepEqual(item.runs[0].dates,['2026-05-21','2025-08-21','2025-03-20','2024-06-14']);assert.equal(item.runs[0].code,'3200');
});
test('repeat streak stops at a nonmatching routine and counts each distinct date once',()=>{
 const v={description:'3200 - finding',type:'BLUE'};
 const visits=[event('2025-01-01','5',{violations:[v]}),event('2025-02-01','0'),event('2025-03-01','5',{violations:[v]}),event('2026-01-01','5',{violations:[v]}),event('2026-01-01','10',{violations:[v]})];
 const item=report([business('a',visits)]).categories.find(c=>c.id==='repeats').items[0];assert.equal(item.longestStreak,2);
});
test('clean plate rewards five consecutive zero-point routines rather than a three-visit cutoff',()=>{
 const visits=['2023-01-01','2024-01-01','2024-06-01','2025-01-01','2025-09-01','2026-01-01'].map((date,i)=>event(date,i===0?'20':'0'));
 const items=report([business('long',visits),business('short',[event('2025-01-01','0'),event('2026-01-01','0')])]).categories.find(c=>c.id==='clean').items;
 assert.equal(items[0].id,'long');assert.equal(items[0].cleanStreak,5);assert.equal(items[0].history.length,6);assert.equal(items[1].cleanStreak,2);
});
