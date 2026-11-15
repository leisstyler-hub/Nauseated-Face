"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SelectorCity {
  name: string;
  slug: string;
  statusLabel: string;
  covered: boolean;
}

export interface SelectorState {
  code: string;
  name: string;
  slug: string;
  cities: SelectorCity[];
}

const STORAGE_KEY = "nf-location";
const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("nf-location-change", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("nf-location-change", callback); };
};
const getSnapshot = () => { try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; } };

export function LocationSelector({ states }: { states: SelectorState[] }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const saved = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choices = states.flatMap(state => state.cities.map(city => ({ label: `${city.name}, ${state.code}`, href: `/${state.slug}/${city.slug}` })));
  choices.push({ label: "All available locations", href: "/locations" });
  let savedHref = "";
  try { savedHref = JSON.parse(saved ?? "null")?.href ?? ""; } catch { /* Ignore invalid stored values. */ }
  const current = choices.find(c => c.href === pathname) ?? choices.find(c => c.href === savedHref) ?? { label: "Seattle, WA", href: "/washington/seattle" };

  const pick = (state: SelectorState, city: SelectorCity) => {
    const next = { label: `${city.name}, ${state.code}`, href: `/${state.slug}/${city.slug}` };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing: selection still navigates, it just isn't remembered.
    }
    window.dispatchEvent(new Event("nf-location-change"));
    setOpen(false);
  };

  const needle = filter.trim().toLowerCase();
  const filtered = states
    .map((state) => ({
      ...state,
      cities: needle
        ? state.cities.filter((city) => city.name.toLowerCase().includes(needle) || state.name.toLowerCase().includes(needle) || state.code.toLowerCase() === needle)
        : state.cities,
    }))
    .filter((state) => state.cities.length > 0);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-card-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-nausea sm:text-sm"
      >
        <span aria-hidden>📍</span>
        <span className="max-w-28 truncate sm:max-w-40">{current.label}</span>
        <span aria-hidden className="text-muted">▾</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          onClick={(event) => { if ((event.target as Element).closest("a")) setOpen(false); }}
          id={listId}
          className="absolute right-0 z-50 mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-xl border border-card-border bg-background p-3 shadow-2xl sm:w-80"
        >
          <label className="sr-only" htmlFor={`${listId}-filter`}>
            Search locations
          </label>
          <input
            id={`${listId}-filter`}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search states or cities…"
            autoFocus
            className="mb-3 w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm outline-none focus:border-nausea"
          />
          {filtered.map((state) => (
            <div key={state.code} className="mb-3">
              <Link
                href={`/${state.slug}`}
                className="text-xs font-bold uppercase tracking-widest text-muted transition-colors hover:text-nausea"
              >
                {state.name}
              </Link>
              <ul className="mt-1">
                {state.cities.map((city) => (
                  <li key={city.slug}>
                    <Link
                      href={`/${state.slug}/${city.slug}`}
                      onClick={() => pick(state, city)}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-card"
                    >
                      <span>{city.name}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${city.covered ? "text-nausea" : "text-muted"}`}>
                        {city.statusLabel}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {filtered.length === 0 && <p className="px-2 py-3 text-sm text-muted">No matching locations yet.</p>}
          <Link href="/locations" className="block rounded-lg px-2 py-1.5 text-sm font-semibold text-nausea transition-colors hover:bg-card">
            All available locations →
          </Link>
        </div>
      )}
    </div>
  );
}
