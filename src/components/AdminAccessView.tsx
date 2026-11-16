import { AdminInvitation } from './AdminInvitation';
export interface AdminAccount {id:string;name:string;email:string;role:string}
export function AdminAccessView({accounts}:{accounts:AdminAccount[]}){
 const active = (account:AdminAccount) => account.role.toLowerCase() === 'owner' || account.role.startsWith('Owner ·');
 const ordered = [...accounts].sort((a,b)=>Number(active(b))-Number(active(a))||a.name.localeCompare(b.name));
 return <>
  <h1 className="text-3xl font-extrabold">Admin Access</h1>
  <p className="my-5 max-w-2xl text-sm leading-7 text-muted">Manage administrator access and invitations. A founder title alone does not grant account access.</p>
  <section aria-label="Founders" className="mb-8 rounded-xl border border-nausea/30 bg-nausea-soft p-5 sm:p-6">
   <h2 className="text-xs font-bold uppercase tracking-widest text-nausea">Founders</h2>
   <ul className="mt-4 grid gap-4 sm:grid-cols-2">{['Tyler','Micah Mowrey'].map(name=><li key={name} className="flex min-w-0 flex-wrap items-center gap-3"><h3 className="break-words font-bold">{name}</h3><span className="rounded-full border border-nausea/30 px-3 py-1 text-xs font-bold text-nausea">Founder</span></li>)}</ul>
  </section>
  <section aria-label="People and access">
   <h2 className="mb-4 text-xl font-bold">People and access</h2>
   <ul className="grid gap-4 sm:grid-cols-2">{ordered.map(account=><li key={account.id} className="min-w-0 rounded-xl border border-card-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 break-words font-bold">{account.name}</h3>{active(account)&&<span className="shrink-0 rounded-full border border-nausea/30 bg-nausea-soft px-3 py-1 text-xs font-bold text-nausea">Admin</span>}</div>
    <p className="mt-2 break-all text-sm text-muted">{account.email}</p>
    <p className="mt-3 text-sm text-muted">{active(account)?'Administrator access':account.role}</p>
   </li>)}</ul>
   <p className="mt-4 text-xs leading-6 text-muted">Micah needs an administrator invitation if his account is not listed with an Admin badge. Pending invitations do not yet have access.</p>
  </section>
  <AdminInvitation />
 </>;
}
