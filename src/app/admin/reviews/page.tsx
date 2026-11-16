import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {getAdminAuth,ownerSession} from '../../../../backend/admin-auth.mjs';
import {ReviewModeration} from '@/components/ReviewModeration';
export default async function ReviewsPage(){
 const session=await ownerSession(getAdminAuth(),await headers());if(!session)redirect('/admin/login');
 return <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6"><ReviewModeration/></section>;
}
