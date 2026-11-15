import { AdminLogin } from "@/components/AdminLogin";
export default function LoginPage() {
  return <section className="mx-auto w-full max-w-md px-4 py-14"><p className="text-xs font-bold tracking-widest text-nausea">PRIVATE BUSINESS OPERATIONS</p><h1 className="mt-3 text-3xl font-extrabold">Command Center 🤢</h1><p className="my-5 text-sm text-muted">Sign in with your provisioned administrator account.</p><AdminLogin /></section>;
}
