"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminControls() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  return <div className="rounded-xl border border-card-border bg-card p-5 sm:p-7">
    <h2 className="text-xl font-bold">Refresh enabled inspection sources</h2>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">Collect the configured recent samples from enabled official sources. This preserves inspection history and does not activate new jurisdictions. The action and your administrator ID are recorded.</p>
    <p className="mt-3 text-xs leading-6 text-muted">One administrator refresh at a time, with at least one minute between attempts. This is not a full historical backfill.</p>
    <button disabled={busy} className="mt-5 min-h-12 w-full rounded-lg bg-nausea px-5 py-3 font-bold text-background hover:bg-nausea/90 disabled:cursor-wait disabled:opacity-50 sm:w-auto" onClick={async () => {
      if (busy) return;
      setBusy(true); setMessage(""); setFailed(false);
      try {
        const response = await fetch("/api/admin/controls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh" }) });
        const result = await response.json();
        if (!response.ok) { setFailed(true); setMessage(result.error || "Refresh could not complete."); return; }
        const failedCount = result.failures?.length ?? 0;
        setFailed(failedCount > 0);
        setMessage(failedCount ? `Refresh finished with ${failedCount} source failure(s). Check source status and import history; previous committed records are retained.` : `Refresh completed for ${result.sources?.length ?? 0} enabled source(s). Source status and import history are updated.`);
        router.refresh();
      } catch { setFailed(true); setMessage("Connection interrupted. Check import history before retrying; the server may still be working."); }
      finally { setBusy(false); }
    }}>{busy ? "Refreshing sources…" : "Refresh sources"}</button>
    <p role="status" aria-live="polite" className={`mt-4 text-sm leading-6 ${failed ? "text-warning" : "text-nausea"}`}>{busy ? "Collecting official records. Keep this page open while the request completes." : message}</p>
  </div>;
}
