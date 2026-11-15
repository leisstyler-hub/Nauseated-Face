export function pageCategory(path){
 const p=String(path).split('?')[0];
 if(p==='/')return 'home';
 if(p.startsWith('/restaurants/'))return 'restaurant';
 if(p.startsWith('/inspections'))return 'inspection';
 if(['/search','/locations','/about','/privacy'].includes(p))return p.slice(1);
 if(/^\/[a-z-]+\/[a-z-]+$/.test(p))return 'city';
 return 'other';
}
