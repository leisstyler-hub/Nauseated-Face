"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AdminSignOut() {
  const router = useRouter(); const [error, setError] = useState(false);
  return <div><button className="rounded-full border border-card-border px-4 py-2 text-sm" onClick={async () => { try { const response = await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); if (!response.ok) throw Error(); router.replace("/admin/login"); router.refresh(); } catch { setError(true); } }}>Sign out</button>{error && <p role="alert" className="mt-2 text-xs text-warning">Unable to sign out. Please retry.</p>}</div>;
}
