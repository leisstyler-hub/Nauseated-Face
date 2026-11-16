"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminInvitation() {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const router = useRouter();
  return <section className="my-8 rounded-xl border border-card-border bg-card p-5 sm:p-7"><h2 className="text-xl font-bold">Invite an administrator</h2>
    <p className="mt-3 text-sm leading-6 text-muted">Invited administrators receive full owner access to private controls and records. Neon emails password setup and, when required, email verification. Setup invitations expire after seven days; password links expire sooner.</p>
    <form className="mt-5 grid gap-4 sm:grid-cols-2" aria-busy={busy} onSubmit={async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError(''); setMessage('');
      try { const response = await fetch('/api/admin/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email') }) });
        const result = await response.json(); if (!response.ok) throw Error(result.error || 'Invitation failed');
        setMessage('Password setup email requested. Ask the recipient to check their inbox and spam folder, and complete email verification if prompted.'); router.refresh();
      } catch (failure) { setError(failure instanceof Error ? failure.message : 'Invitation unavailable'); } finally { setBusy(false); }
    }}>
      <label className="grid gap-2 text-sm">Name<input required name="name" maxLength={100} autoComplete="name" className="min-h-12 min-w-0 rounded-lg border border-card-border bg-background px-3 text-base" /></label>
      <label className="grid gap-2 text-sm">Email address<input required name="email" type="email" maxLength={254} autoComplete="email" className="min-h-12 min-w-0 rounded-lg border border-card-border bg-background px-3 text-base" /></label>
      <button disabled={busy} className="min-h-12 rounded-lg bg-nausea px-5 py-3 font-bold text-background disabled:opacity-50 sm:col-span-2">{busy ? 'Sending…' : 'Send invitation / resend setup'}</button>
      {message && <p role="status" className="text-sm text-nausea sm:col-span-2">{message}</p>}{error && <p role="alert" className="text-sm text-warning sm:col-span-2">{error}</p>}
    </form></section>;
}
