export async function searchWithCityExpansion(store,options={}){
 const local=await store.searchEstablishments(options);
 let elsewhere=[];let expansionFailed=false;
 if(options.stateCode&&options.city){
  try{elsewhere=await store.searchEstablishments({...options,city:'',jurisdictionId:'',excludeCity:options.city,offset:0});}catch{expansionFailed=true;}
 }
 return {local,elsewhere,expansionFailed};
}
export function citySuggestions(groups,limit){
 const widerCount=Math.min(groups.elsewhere.length,Math.max(0,limit-1),Math.max(1,Math.floor(limit/3)));
 const local=groups.local.slice(0,limit-widerCount);
 const elsewhere=groups.elsewhere.slice(0,limit-local.length);
 return [...local.map(r=>({...r,matchScope:'local'})),...elsewhere.map(r=>({...r,matchScope:'elsewhere'}))];
}
