import {pageCategory} from '../../backend/traffic-categories.mjs';
let queue=Promise.resolve();
export function trafficAllowed(){
 try{return !location.pathname.startsWith('/admin')&&!location.pathname.startsWith('/api')&&location.pathname!=='/maintenance'&&!navigator.webdriver&&navigator.doNotTrack!=='1'&&!(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl&&localStorage.getItem('nf-analytics-opt-out')!=='true';}catch{return false;}
}
function contentKey(path:string){return /^\/(restaurants|rankings|inspections)\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(path)&&path.length<=180?path:'unknown';}
function source(){
 const medium=new URLSearchParams(location.search).get('utm_medium')?.toLowerCase();
 if(medium&&['email','social','paid','cpc'].includes(medium))return medium==='cpc'?'paid':medium;
 try{if(!document.referrer)return 'direct-or-unknown';const host=new URL(document.referrer).hostname;
  if(host===location.hostname)return 'internal';
  if(/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(host))return 'search';
  if(/(^|\.)(facebook\.com|instagram\.com|t\.co|reddit\.com|linkedin\.com|x\.com)$/.test(host))return 'social';
  return 'referral';
 }catch{return 'unknown';}
}
// Serialize sends so the first response sets the HttpOnly cookie before later events.
export function trackTraffic(action='pageview',target=location.pathname){
 try{
 if(!trafficAllowed())return;
 const path=location.pathname;
 const rawArea=document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('nf-area='))?.slice(8)??'';
 const area=/^[a-z-]+\/[a-z0-9-]+$/.test(rawArea)&&rawArea.length<=120?rawArea:'unknown';
 const body={eventId:crypto.randomUUID(),category:pageCategory(path),action,area,content:contentKey(target),device:innerWidth<640?'phone':innerWidth<1024?'tablet':'desktop',source:source()};
 queue=queue.then(async()=>{if(trafficAllowed())await fetch('/api/traffic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true});}).catch(()=>{});
 }catch{/* Collection must never interrupt a public action. */}
}
