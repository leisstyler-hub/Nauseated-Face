"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function WebsiteToggle({ enabled: initialEnabled }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  async function save(next: boolean) {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/website", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: next, confirmed: true }) });
      const body = await response.json();
      if (!response.ok) throw Error(body.error || "Could not save website availability.");
      setEnabled(body.enabled);
      dialog.current?.close();
      setMessage(next ? "Website is on. Public pages are available." : "Website is off. Visitors now see the back-soon screen.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connection interrupted. Check the website status before retrying."); }
    finally { setPending(false); }
  }
  return <div className="rounded-xl border border-card-border bg-card p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Website availability</h2><p className="mt-2 text-sm font-bold text-nausea">{enabled ? "Website is on" : "Website is off"}</p></div>
      <button type="button" role="switch" aria-checked={enabled} aria-label={enabled ? "Turn website off" : "Turn website on"} disabled={pending} onClick={() => enabled ? dialog.current?.showModal() : save(true)} className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full disabled:opacity-50 ${enabled ? "bg-nausea" : "bg-card-border"}`}><span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} /></button>
    </div>
    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">Turning the website off replaces public pages with our back-soon screen. Admin access stays open so you can turn it back on. Saved inspection records are preserved.</p>
    <a href="/maintenance" target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm text-nausea underline">Preview the back-soon screen</a>
    <p role="status" className="mt-3 text-sm leading-6 text-muted">{pending ? "Saving website availability..." : message}</p>
    <dialog ref={dialog} aria-labelledby="website-warning-title" aria-describedby="website-warning-description" onCancel={event => { if (pending) event.preventDefault(); }} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-card-border bg-card p-6 text-foreground shadow-xl backdrop:bg-black/75">
      <h3 id="website-warning-title" className="text-2xl font-extrabold">Turn the website off?</h3>
      <p id="website-warning-description" className="mt-4 text-sm leading-7 text-muted">All public pages will show the back-soon screen, and public searches and inspection APIs will pause. You can still sign in to Admin Controls and turn the website back on. Your saved records will stay intact.</p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" autoFocus disabled={pending} onClick={() => dialog.current?.close()} className="min-h-12 rounded-lg border border-card-border px-4 font-bold">Cancel</button><button type="button" disabled={pending} onClick={() => save(false)} className="min-h-12 rounded-lg bg-warning px-4 font-bold text-black disabled:opacity-50">{pending ? "Turning off..." : "Yes, turn website off"}</button></div>
      {message && <p role="alert" className="mt-4 text-sm text-warning">{message}</p>}
    </dialog>
  </div>;
}
