"use client";
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminRecovery({ token, invalid = false }: { token?: string; invalid?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false);
  const reset = token !== undefined;
  return <section className="mx-auto my-10 w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-card-border bg-card p-6 sm:my-16 sm:p-9">
    <p className="text-xs font-bold uppercase tracking-widest text-nausea">Nauseated Face · Administrator access</p>
    <h1 className="mt-4 text-3xl font-extrabold">{reset ? 'Set a new password' : 'Reset your password'}</h1>
    <p className="my-5 text-sm leading-7 text-muted">{reset ? 'Choose a password of 16–128 characters. After saving, you will return to sign in.' : 'Enter the email on your invited administrator account. If an account exists, Neon will email a password reset link.'}</p>
    {invalid || (reset && !token) ? <p role="alert" className="mb-5 text-sm text-warning">This link is missing, expired or invalid. Request a new password link below.</p> : <form aria-busy={busy} className="grid gap-5" onSubmit={async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget); setError(''); setBusy(true);
      try {
        if (reset && form.get('password') !== form.get('confirm')) { setError('Passwords do not match.'); return; }
        const response = await fetch(`/api/auth/neon/${reset ? 'reset-password' : 'request-password-reset'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reset ? { token, newPassword: form.get('password') } : { email: String(form.get('email')).trim().toLowerCase(), redirectTo: `${location.origin}/admin/reset-password` }) });
        if (!response.ok) throw Error(reset ? 'This link may have expired or already been used. Request a new link.' : 'Unable to request an email right now. Please retry later.');
        if (reset) { router.replace('/admin/login?password=updated'); router.refresh(); }
        else setSent(true);
      } catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.'); } finally { setBusy(false); }
    }}>
      {reset ? <><label className="grid gap-2 text-sm">New password<input required type="password" name="password" autoComplete="new-password" minLength={16} maxLength={128} className="min-h-12 min-w-0 rounded-lg border border-card-border bg-background px-3 text-base" /></label><label className="grid gap-2 text-sm">Confirm new password<input required type="password" name="confirm" autoComplete="new-password" minLength={16} maxLength={128} className="min-h-12 min-w-0 rounded-lg border border-card-border bg-background px-3 text-base" /></label></> : <label className="grid gap-2 text-sm">Email address<input required type="email" name="email" autoComplete="email" className="min-h-12 min-w-0 rounded-lg border border-card-border bg-background px-3 text-base" /></label>}
      {error && <p role="alert" className="text-sm text-warning">{error}</p>}{sent && <p role="status" className="text-sm text-nausea">If that account exists, check its inbox and spam folder for a reset link.</p>}
      <button disabled={busy} className="min-h-12 rounded-lg bg-nausea px-5 py-3 font-bold text-background disabled:opacity-50">{busy ? 'Please wait…' : reset ? 'Save password and return to login' : 'Send reset link'}</button>
    </form>}
    <div className="mt-6 flex flex-wrap gap-5 text-sm font-bold text-nausea"><Link href="/admin/login">Back to sign in</Link>{reset && <Link href="/admin/forgot-password">Request a new link</Link>}</div>
  </section>;
}
