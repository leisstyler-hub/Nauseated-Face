"use client";
import {useEffect,useRef} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {trackTraffic} from '@/lib/traffic-client';
export function TrafficTracker(){
 const path=usePathname(),params=useSearchParams();
 const key=path+'?'+params.toString();const last=useRef('');
 useEffect(()=>{
  function view(){if(document.visibilityState==='visible'&&last.current!==key){last.current=key;trackTraffic();}}
  function click(event:MouseEvent){
   const el=event.target instanceof Element?event.target.closest('a,button[data-traffic-action]'):null;
   if(!el)return;
   const named=el.getAttribute('data-traffic-action');const href=el.getAttribute('href');
   if(named){trackTraffic(named,href?.startsWith('/')?href.split('?')[0]:path);return;}
   if(!href)return;
   const url=new URL(href,location.href);if(url.origin!==location.origin)return;
   if(url.pathname.startsWith('/restaurants/'))trackTraffic(path==='/search'||el.closest('[role="listbox"]')?'search_result_click':'restaurant_click',url.pathname);
   else if(url.pathname.startsWith('/rankings/'))trackTraffic('category_click',url.pathname);
   else if(url.pathname.startsWith('/inspections/')||href.startsWith('#inspection-'))trackTraffic('full_report_click',url.pathname);
  }
  const city=()=>trackTraffic('city_select');
  view();document.addEventListener('visibilitychange',view);document.addEventListener('click',click,true);window.addEventListener('nf-location-change',city);
  return()=>{document.removeEventListener('visibilitychange',view);document.removeEventListener('click',click,true);window.removeEventListener('nf-location-change',city);};
 },[key,path]);
 return null;
}
