// Geography choices are resolved from the current registry and published catalog.
export const DEFAULT_AREA = 'washington/greater-seattle';
export function resolveHomeArea(states, value = DEFAULT_AREA) {
 const wa=states.find(s=>s.code==='WA');
 if(value===DEFAULT_AREA || !value || typeof value!=='string') return {key:DEFAULT_AREA,label:'Greater Seattle',stateCode:'WA',stateSlug:'washington',city:'',jurisdictionId:'wa-king',covered:Boolean(wa?.cities.some(c=>c.jurisdictionId==='wa-king'&&c.covered)),description:'King County cities. Does not include Pierce or Snohomish County.'};
 const [stateSlug,citySlug,...rest]=value.split('/');const state=states.find(s=>s.slug===stateSlug);const city=state?.cities.find(c=>c.slug===citySlug);
 if(!city||rest.length)return resolveHomeArea(states);
 return {key:value,label:`${city.name}, ${state.code}`,stateCode:state.code,stateSlug:state.slug,city:city.name,jurisdictionId:city.jurisdictionId,covered:city.covered,description:`${city.jurisdictionName} public inspection records.`};
}
