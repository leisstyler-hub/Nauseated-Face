"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPasswordField } from "@/components/AdminPasswordField";
export function AdminLogin() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <form aria-busy={busy} className="flex flex-col gap-5" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password"), rememberMe: false }) });
      if (!response.ok) { setError(response.status === 503 ? "Administrator access has not been configured yet." : response.status === 429 ? "Too many attempts. Please wait a minute." : "Unable to sign in. Check your credentials."); return; }
      router.replace("/admin"); router.refresh();
    } catch { setError("Sign-in is temporarily unavailable."); } finally { setBusy(false); }
  }}>
    <label className="flex flex-col gap-2 text-sm font-medium">Email address<input required name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} className="min-h-12 rounded-lg border border-card-border bg-background px-3 text-base outline-none transition-colors focus:border-nausea" /></label>
    <AdminPasswordField />
    {error && <p role="alert" aria-live="polite" className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">{error}</p>}
    <button disabled={busy} className="min-h-12 rounded-lg bg-nausea px-5 py-3 font-bold text-background transition-colors hover:bg-nausea/90 disabled:cursor-wait disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
  </form>;
}
