"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { nearbyCities } from "@/lib/nearby";

export interface SelectorCity {
  name: string;
  slug: string;
  statusLabel: string;
  covered: boolean;
  inspectionCount?: number;
  latitude: number | null;
  longitude: number | null;
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

function rememberArea(value: string) {
  document.cookie = `nf-area=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}

export function LocationSelector({ states, initialArea = "", regionInspectionCount = 0 }: { states: SelectorState[]; initialArea?: string; regionInspectionCount?: number }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [nearby, setNearby] = useState<(SelectorCity & { state: SelectorState; miles: number })[]>([]);
  const saved = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('nf-open-location', show);
    return () => window.removeEventListener('nf-open-location', show);
  }, []);

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
  choices.push({ label: "Greater Seattle", href: "/washington/greater-seattle" });
  let savedHref = "";
  try { savedHref = JSON.parse(saved ?? "null")?.href ?? ""; } catch { /* Ignore invalid stored values. */ }
  const profileState = pathname.startsWith("/restaurants/") ? states.find(state => state.slug === pathname.split("/")[2]) : undefined;
  const current = choices.find(c => c.href === pathname) ?? (profileState ? { label: profileState.name, href: `/${profileState.slug}` } : undefined) ?? choices.find(c => c.href === "/" + initialArea) ?? (initialArea ? choices.find(c => c.href === savedHref) : undefined) ?? { label: "Choose a city", href: "" };

  const pick = (state: SelectorState, city: SelectorCity) => {
    const next = { label: `${city.name}, ${state.code}`, href: `/${state.slug}/${city.slug}` };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing: selection still navigates, it just isn't remembered.
    }
    rememberArea(`${state.slug}/${city.slug}`);
    window.dispatchEvent(new Event("nf-location-change"));
    router.refresh();
    setOpen(false);
  };

  const locate = () => {
    setNearby([]);
    if (!navigator.geolocation) {
      setLocationMessage("Location sharing is unavailable in this browser. Choose a city below.");
      return;
    }
    setLocating(true);
    setLocationMessage("Waiting for location permission...");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLocating(false);
      if (!Number.isFinite(coords.accuracy) || coords.accuracy > 80000) {
        setLocationMessage("Your location is too approximate to suggest nearby records. Choose a city below.");
        return;
      }
      const matches = nearbyCities(coords.latitude, coords.longitude, states.flatMap(state => state.cities.map(city => ({ ...city, state }))));
      setNearby(matches);
      setLocationMessage(matches.length ? "Nearby cities with records (within about 50 miles). Coverage may be limited." : "No nearby cities could be matched yet. Choose a city below to check available coverage.");
    }, (error) => {
      setLocating(false);
      setLocationMessage(error.code === 1 ? "Location permission was not granted. You can still choose a city below." : "We could not get your location. Try again or choose a city below.");
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
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
          <button type="button" onClick={locate} disabled={locating} className="mb-1 w-full rounded-lg border border-nausea/40 bg-nausea/10 px-3 py-2 text-sm font-semibold text-nausea disabled:opacity-60">
            {locating ? "Finding nearby records..." : "Use my location"}
          </button>
          <p className="mb-3 text-xs text-muted">Optional. Your browser asks permission. Coordinates stay in your browser; only your chosen city is remembered.</p>
          <p role="status" className="mb-2 text-xs text-muted">{locationMessage}</p>
          {nearby.map(city => <Link key={`${city.state.code}-${city.slug}`} href="/" prefetch={false} onClick={() => pick(city.state, city)} className="mb-2 block rounded-lg border border-nausea/30 px-3 py-2 text-sm text-nausea">
            {city.name}, {city.state.code} <span className="block text-xs text-muted">{city.statusLabel} · about {Math.round(city.miles)} miles to the city area</span>
          </Link>)}
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
          {(!needle || 'greater seattle king county'.includes(needle)) && <Link href="/" prefetch={false} onClick={() => pick({code:'WA',name:'Washington',slug:'washington',cities:[]},{name:'Greater Seattle',slug:'greater-seattle',statusLabel:'King County cities',covered:true,latitude:null,longitude:null})} className="mb-3 block rounded-lg border border-nausea/40 bg-nausea-soft px-3 py-3 text-sm font-bold text-nausea">Greater Seattle<span className="mt-1 block text-xs font-normal text-muted">King County cities together{regionInspectionCount>0 ? ` · ${regionInspectionCount.toLocaleString("en-US")} inspections` : ""}</span></Link>}
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
                      href="/" prefetch={false}
                      onClick={() => pick(state, city)}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-card"
                    >
                      <span>{city.name}{city.covered && <span className="mt-0.5 block text-[11px] font-normal text-muted">{(city.inspectionCount??0).toLocaleString("en-US")} inspections</span>}</span>
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
