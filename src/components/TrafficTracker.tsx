"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { pageCategory } from "../../backend/traffic-categories.mjs";

export function TrafficTracker(){
 const path=usePathname();
 const last=useRef({path:"",at:0});
 useEffect(()=>{
  if(path.startsWith('/admin')||path==='/maintenance')return;
  function track(){
   try{
    if(document.visibilityState!=='visible'||navigator.webdriver||navigator.doNotTrack==='1'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl||localStorage.getItem('nf-analytics-opt-out')==='true')return;
    if(last.current.path===path&&Date.now()-last.current.at<30*60*1000)return;
    last.current={path,at:Date.now()};
    void fetch('/api/traffic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:crypto.randomUUID(),category:pageCategory(path)}),keepalive:true}).catch(()=>{});
   }catch{/* Analytics must never interrupt a public page. */}
  }
  track();document.addEventListener('visibilitychange',track);
  return()=>document.removeEventListener('visibilitychange',track);
 },[path]);
 return null;
}
