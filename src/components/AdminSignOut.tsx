"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AdminSignOut() {
  const router = useRouter(); const [error, setError] = useState(false);
  return <div><button className="rounded-full border border-card-border px-4 py-2 text-sm" onClick={async () => { try {
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' };
    const response = await fetch('/api/auth/sign-out', options);
    const neon = await fetch('/api/auth/neon/sign-out', options);
    if (!response.ok || (!neon.ok && neon.status !== 503)) throw Error();
    router.replace('/admin/login'); router.refresh();
  } catch { setError(true); } }}>Sign out</button>{error && <p role="alert" className="mt-2 text-xs text-warning">Unable to sign out. Please retry.</p>}</div>;
}
