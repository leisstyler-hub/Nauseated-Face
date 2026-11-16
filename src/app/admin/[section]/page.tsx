import { headers } from 'next/headers';
import { notFound,redirect } from 'next/navigation';
import { getAdminAuth,ownerSession } from '../../../../backend/admin-auth.mjs';
import { openSiteStore } from '../../../../backend/production.mjs';
import { AdminDataSection } from '@/components/AdminDataSection';
import type { Operations } from '@/lib/admin';
import { AdminAccessView,type AdminAccount } from '@/components/AdminAccessView';
export default async function AdminSectionPage({params}:{params:Promise<{section:string}>}){
 const auth=getAdminAuth();const session=await ownerSession(auth,await headers());if(!session)redirect('/admin/login');
 const {section}=await params;if(!['sources','imports','storage','access'].includes(section))notFound();
 if(section==='access'){
  const result=await auth.options.database.query('SELECT id,name,email,role FROM "user" ORDER BY email');
  if(process.env.NEON_AUTH_BASE_URL){
   const grants=await auth.options.database.query('SELECT email,name,accepted_at,expires_at,revoked_at FROM admin_access_grants ORDER BY invited_at DESC');
   for(const grant of grants.rows){
    const status=grant.revoked_at?'Revoked':grant.accepted_at?'Owner · Neon':new Date(grant.expires_at)<new Date()?'Invitation expired':'Invitation pending · Owner';
    const existing=result.rows.find((account:AdminAccount)=>account.email.toLowerCase()===grant.email);
    if(existing)existing.role=status;else result.rows.push({id:`invite:${grant.email}`,name:grant.name,email:grant.email,role:status});
   }
  }
  return <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6"><AdminAccessView accounts={result.rows as AdminAccount[]}/></section>;
 }
 const store=openSiteStore();let data:Operations;try{data=await store.operations();}finally{await store.close();}
 return <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6"><AdminDataSection section={section} data={data}/></section>;
}
