import test from 'node:test';import assert from 'node:assert/strict';
import {buildLocationCatalog,canonicalCityKey} from './location-catalog.mjs';
const registry=[{id:'wa-king',stateCode:'WA',stateName:'Washington',name:'King County',healthAuthority:'Official',sourceUrl:'https://example.test',coverageStatus:'limited',cities:['Seattle','Bellevue','Vashon']}];
const record=(city,n)=>({stateCode:'WA',jurisdictionId:'wa-king',city,establishmentCount:1,inspectionCount:n,firstInspectionDate:'2021-01-04',lastInspectionDate:'2026-11-12',latitude:null,longitude:null});
test('Washington merges display variants and ranks by saved inspection counts',()=>{
 const covered=[record('SEATTLE',20),record('Seattle,',3),record('West Seattle',2),record('Bellevue',10),record('KENT',15),record('BELLEUE',1),record('Seattle tacoma',1),record('SEA TAC',4),record('SeaTac',5),record('Vashon Island',2)];
 const [state]=buildLocationCatalog(registry,covered,[{id:'wa-king',enabled:true,coverageStatus:'available'}]);
 assert.deepEqual(state.cities.map(c=>c.name),['Seattle','Kent','Bellevue','SeaTac','Vashon']);
 assert.equal(state.cities[0].inspectionCount,25);assert.equal(state.cities[0].establishmentCount,3);assert.equal(state.cities[0].status,'available');
 assert.equal(new Set(state.cities.map(c=>c.slug)).size,state.cities.length);assert.equal(state.cities.find(c=>c.name==='SeaTac').inspectionCount,9);
 assert.equal(covered[1].city,'Seattle,');assert.equal(covered.length,10);
 assert.equal(canonicalCityKey('WA','  Seattle, '),'seattle');
 assert.equal(buildLocationCatalog(registry,covered,[{id:'wa-king',enabled:false,coverageStatus:'available'}])[0].cities[0].covered,false);
});
