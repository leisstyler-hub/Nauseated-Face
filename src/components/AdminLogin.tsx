"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AdminLogin() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <form className="flex flex-col gap-4" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password"), rememberMe: false }) });
      if (!response.ok) { setError(response.status === 503 ? "Administrator access has not been configured yet." : response.status === 429 ? "Too many attempts. Please wait a minute." : "Unable to sign in. Check your credentials."); return; }
      router.replace("/admin"); router.refresh();
    } catch { setError("Sign-in is temporarily unavailable."); } finally { setBusy(false); }
  }}>
    <label className="flex flex-col gap-2 text-sm">Email<input required name="email" type="email" autoComplete="username" className="rounded-lg border border-card-border bg-card p-3" /></label>
    <label className="flex flex-col gap-2 text-sm">Password<input required name="password" type="password" autoComplete="current-password" className="rounded-lg border border-card-border bg-card p-3" /></label>
    <button disabled={busy} className="rounded-full bg-nausea px-5 py-3 font-bold text-background disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
    {error && <p role="alert" className="text-sm text-warning">{error}</p>}
  </form>;
}
