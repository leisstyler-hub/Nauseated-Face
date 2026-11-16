export async function guestCall(path:string,body?:unknown){
 const response=await fetch(path,{cache:'no-store',...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 const data=await response.json().catch(()=>({error:'Service temporarily unavailable.'}));
 if(!response.ok)throw Object.assign(new Error(data.error||'Please retry.'),{status:response.status});
 return data;
}
export const businessHref=(state:string,slug:string)=>`/restaurants/${encodeURIComponent(state.toLowerCase())}/${encodeURIComponent(slug)}`;
