import {canonicalCityKey} from './location-catalog.mjs';
// Geography choices are resolved from the current registry and published catalog.
export const DEFAULT_AREA = 'washington/greater-seattle';
export function resolveHomeArea(states, value = '') {
 const unselected={key:'',label:'Choose a city',stateCode:'',stateSlug:'',city:'',jurisdictionId:'',covered:false,selected:false,description:'Choose an area to view its inspection records.'};
 if(!value||typeof value!=='string')return unselected;
 const wa=states.find(s=>s.code==='WA');
 if(value===DEFAULT_AREA) return {key:DEFAULT_AREA,label:'Greater Seattle',stateCode:'WA',stateSlug:'washington',city:'',jurisdictionId:'wa-king',covered:Boolean(wa?.cities.some(c=>c.jurisdictionId==='wa-king'&&c.covered)),selected:true,description:'King County cities. Does not include Pierce or Snohomish County.'};
 const [stateSlug,citySlug,...rest]=value.split('/');const state=states.find(s=>s.slug===stateSlug);const city=state?.cities.find(c=>c.slug===canonicalCityKey(state.code,citySlug));
 if(!city||rest.length)return unselected;
 return {key:`${state.slug}/${city.slug}`,label:`${city.name}, ${state.code}`,stateCode:state.code,stateSlug:state.slug,city:city.name,jurisdictionId:city.jurisdictionId,covered:city.covered,selected:true,description:`${city.jurisdictionName} public inspection records.`};
}
