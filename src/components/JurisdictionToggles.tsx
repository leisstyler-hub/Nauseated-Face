"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Operations } from "@/lib/admin";

export function JurisdictionToggles({ sources }: { sources: Operations["sources"] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  const toggle = async (id: string, next: boolean) => {
    if (pending) return;
    setPending(id);
    setError("");
    try {
      const response = await fetch("/api/admin/jurisdictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-availability", jurisdictionId: id, enabled: next }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Could not update availability. The city was not changed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Connection interrupted. Check the city's status before retrying.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="rounded-xl border border-card-border bg-card p-5 sm:p-7">
      <h2 className="text-xl font-bold">City availability</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">Turn a city on or off. Turning it off stops its source refresh and removes its locations and records from the public site; turning it back on restores them. Each change is recorded with your administrator ID.</p>
      <ul className="mt-5 divide-y divide-card-border">
        {sources.map((source) => {
          const busy = pending === source.id;
          return (
            <li key={source.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{source.name}{source.stateCode ? `, ${source.stateCode}` : ""}</p>
                <p className="mt-1 break-words text-xs leading-6 text-muted">{source.healthAuthority} · {source.coverageStatus.replaceAll("_", " ")} · {source.establishmentCount} saved</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={`text-xs font-bold uppercase tracking-wide ${source.enabled ? "text-nausea" : "text-muted"}`}>{source.enabled ? "Live" : "Off"}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={source.enabled}
                  aria-label={`${source.enabled ? "Turn off" : "Turn on"} ${source.name}`}
                  disabled={busy}
                  onClick={() => toggle(source.id, !source.enabled)}
                  className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${source.enabled ? "bg-nausea" : "bg-card-border"}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${source.enabled ? "translate-x-7" : "translate-x-1"}`} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p role="status" aria-live="polite" className={`mt-4 text-sm leading-6 ${error ? "text-warning" : "text-muted"}`}>{error || (pending ? "Updating availability — the public site refreshes when this completes." : "")}</p>
    </div>
  );
}
