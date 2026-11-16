import { AdminLogin } from "@/components/AdminLogin";
import { Face } from "@/components/Face";
export default function LoginPage() {
  return <section className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-8 sm:px-6 sm:py-14">
    <div className="grid w-full overflow-hidden rounded-2xl border border-card-border lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="bg-nausea-soft p-6 sm:p-9 lg:p-12">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-nausea/25 bg-background text-3xl" aria-hidden><Face /></span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-nausea">Nauseated Face</p>
        <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Behind the gag reflex.</h2>
        <p className="mt-4 max-w-md text-sm leading-7 text-muted">The private workspace for the people behind the public records.</p>
        <p className="mt-6 border-t border-nausea/15 pt-5 text-xs leading-6 text-muted">Authorized administrators only. Your inspection sources, saved records and import history are managed here.</p>
      </aside>
      <div className="min-w-0 bg-card p-6 sm:p-9 lg:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-nausea">Private business operations</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Command Center</h1>
        <p className="mb-7 mt-3 text-sm leading-6 text-muted">Welcome back. Sign in with your approved administrator account.</p>
        <AdminLogin />
      </div>
    </div>
  </section>;
}
