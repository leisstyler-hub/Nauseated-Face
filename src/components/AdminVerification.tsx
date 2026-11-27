"use client";
import Link from 'next/link';
import { useState } from 'react';

export function AdminVerification() {
  const [email, setEmail] = useState(''), [code, setCode] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [verified, setVerified] = useState(false);
  async function submit(resend: boolean) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/auth/neon/email-otp/${resend ? 'send-verification-otp' : 'verify-email'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resend ? { email: email.trim().toLowerCase(), type: 'email-verification' } : { email: email.trim().toLowerCase(), otp: code.trim() })
      });
      if (!response.ok) { setError(response.status === 429 ? 'Too many attempts. Please wait before trying again.' : resend ? 'Unable to request a code. Please try again later.' : 'This code is invalid or expired. Check the latest email or request a new code.'); return; }
      if (resend) setMessage('Code requested. Check your inbox and spam folder for the latest verification email.');
      else { setVerified(true); setCode(''); }
    } catch { setError('Email verification is temporarily unavailable. Please try again.'); }
    finally { setBusy(false); }
  }
  const field = 'min-h-12 min-w-0 rounded-lg border border-card-border bg-background px-3 text-base';
  return <section className="mx-auto my-10 w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-card-border bg-card p-6 sm:my-16 sm:p-9">
    <p className="text-xs font-bold uppercase tracking-widest text-nausea">Administrator setup</p>
    <h1 className="mt-4 text-3xl font-extrabold">Verify your email</h1>
    {verified ? <div role="status" className="my-5 text-sm leading-7"><p>Email verified. Sign in with your password to finish admin setup. Your account must also have an active administrator invitation.</p><Link href="/admin/login" className="mt-5 inline-flex min-h-12 items-center font-bold text-nausea">Continue to sign in</Link></div> : <>
      <p className="my-5 text-sm leading-7 text-muted">Enter your invited email address and the six-digit verification code from Neon. If your email contains a verification link, you can use that link instead.</p>
      <form aria-busy={busy} className="grid gap-5" onSubmit={event => { event.preventDefault(); void submit(false); }}>
        <label className="grid gap-2 text-sm">Email address<input required type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={event => setEmail(event.target.value)} className={field} /></label>
        <label className="grid gap-2 text-sm">Verification code<input required type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} className={field} /></label>
        {error && <p role="alert" className="text-sm text-warning">{error}</p>}
        {message && <p role="status" className="text-sm text-nausea">{message}</p>}
        <button disabled={busy} className="min-h-12 rounded-lg bg-nausea px-5 py-3 font-bold text-background disabled:opacity-50">{busy ? 'Please wait…' : 'Verify email'}</button>
        <button type="button" disabled={busy} className="min-h-12 font-bold text-nausea disabled:opacity-50" onClick={event => {
          const input = event.currentTarget.form?.querySelector('input[type=email]') as HTMLInputElement | null;
          if (input?.reportValidity()) void submit(true);
        }}>Send a new verification code</button>
      </form>
    </>}
    <div className="mt-6 flex flex-wrap gap-5 text-sm font-bold text-nausea"><Link href="/admin/login">Back to sign in</Link><Link href="/admin/forgot-password">Set or reset password</Link></div>
  </section>;
}
