import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminAuth,ownerSession } from '../../../../backend/admin-auth.mjs';
import { trafficReport } from '../../../../backend/traffic.mjs';
import { TrafficPanel } from '@/components/TrafficPanel';
import type { TrafficReport } from '@/lib/traffic';
export default async function TrafficPage(){
 const auth=getAdminAuth();if(!await ownerSession(auth,await headers()))redirect('/admin/login');
 let report:TrafficReport|null=null,error='';
 try{report=await trafficReport(auth.options.database,'7');}catch{error='Traffic reporting unavailable. No estimated counts are substituted.';}
 return <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6"><TrafficPanel initialReport={report} initialError={error}/></section>;
}
