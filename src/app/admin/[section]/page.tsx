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
  return <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6"><AdminAccessView accounts={result.rows as AdminAccount[]}/></section>;
 }
 const store=openSiteStore();let data:Operations;try{data=await store.operations();}finally{await store.close();}
 return <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6"><AdminDataSection section={section} data={data}/></section>;
}
