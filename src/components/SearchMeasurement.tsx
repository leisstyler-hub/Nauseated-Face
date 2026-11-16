"use client";
import {useEffect,useRef} from 'react';
import {trackTraffic} from '@/lib/traffic-client';
export function SearchMeasurement({empty}:{empty:boolean}){
 const sent=useRef(false);
 useEffect(()=>{if(!sent.current){sent.current=true;trackTraffic(empty?'search_empty':'search_results');}},[empty]);
 return null;
}
