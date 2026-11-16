import {GuestAccount} from '@/components/GuestAccount';
import {googleReady} from '@/lib/guests';
import {connection} from 'next/server';
export const metadata={title:'Your account',robots:{index:false,follow:false}};
export default async function AccountPage(){await connection();return <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6"><GuestAccount googleReady={googleReady()}/></section>;}
