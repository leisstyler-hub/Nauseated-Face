import {test} from 'node:test';import assert from 'node:assert/strict';import {searchWithCityExpansion,citySuggestions} from './search-expansion.mjs';
test('city expansion stays in state and removes city/jurisdiction restrictions only for other-city matches',async()=>{
 const calls=[];const store={searchEstablishments:async o=>{calls.push(o);return [{id:o.excludeCity?'other':'local'}];}};
 const r=await searchWithCityExpansion(store,{q:'prime',stateCode:'WA',city:'Seattle',jurisdictionId:'wa-king',limit:6,offset:20});
 assert.deepEqual(r.local,[{id:'local'}]);assert.deepEqual(r.elsewhere,[{id:'other'}]);assert.equal(calls[1].stateCode,'WA');assert.equal(calls[1].city,'');assert.equal(calls[1].jurisdictionId,'');assert.equal(calls[1].excludeCity,'Seattle');assert.equal(calls[1].offset,0);
 calls.length=0;await searchWithCityExpansion(store,{q:'prime',city:'Seattle'});assert.equal(calls.length,1);
 calls.length=0;await searchWithCityExpansion(store,{q:'prime',stateCode:'WA'});assert.equal(calls.length,1);
});
test('other-city search failure keeps local matches and exposes the failure',async()=>{const store={searchEstablishments:async o=>{if(o.excludeCity)throw Error('unavailable');return [{id:'local'}];}};const r=await searchWithCityExpansion(store,{stateCode:'WA',city:'Seattle'});assert.equal(r.expansionFailed,true);assert.equal(r.local.length,1);assert.deepEqual(r.elsewhere,[]);});
test('autocomplete reserves room for other-city matches while keeping local first',()=>{const rows=citySuggestions({local:Array.from({length:6},(_,id)=>({id})),elsewhere:[{id:'other1'},{id:'other2'}]},6);assert.equal(rows.length,6);assert.equal(rows[0].matchScope,'local');assert.equal(rows[4].matchScope,'elsewhere');assert.equal(rows[5].id,'other2');});
