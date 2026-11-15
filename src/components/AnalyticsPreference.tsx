"use client";
import { useSyncExternalStore } from "react";
const subscribe=(notify:()=>void)=>{window.addEventListener('storage',notify);window.addEventListener('nf-privacy',notify);return()=>{window.removeEventListener('storage',notify);window.removeEventListener('nf-privacy',notify);};};
export function AnalyticsPreference(){
 const optedOut=useSyncExternalStore(subscribe,()=>{try{return localStorage.getItem('nf-analytics-opt-out')==='true';}catch{return true;}},()=>false);
 function changePreference(){
  try{
   localStorage.setItem('nf-analytics-opt-out',String(!optedOut));
   window.dispatchEvent(new Event('nf-privacy'));
   if(!optedOut)void fetch('/api/traffic',{method:'DELETE'}).catch(()=>{});
  }catch{/* Browser storage is unavailable; tracking is already skipped. */}
 }
 return <div className="rounded-xl border border-card-border bg-card p-5"><p className="mb-3">Anonymous analytics preference: {optedOut?'disabled in this browser':'enabled unless your browser sends Do Not Track or Global Privacy Control'}.</p><button className="min-h-12 rounded-lg border border-nausea px-4 font-bold text-nausea" onClick={changePreference}>{optedOut?'Allow anonymous analytics':'Disable anonymous analytics'}</button></div>;
}
