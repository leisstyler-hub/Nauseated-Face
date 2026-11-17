"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Face } from './Face';

import {trackTraffic} from '@/lib/traffic-client';

interface Suggestion {
  name: string;
  city: string | null;
  stateCode: string;
  stateSlug: string;
  slug: string;
  latestResult: string | null;
  matchScope?: string;
}

export function SearchBox({ placeholder = "Search restaurants, cities, or addresses…", autoFocus = false, initialQuery = "", clearOnNavigate = false, state = "", city = "", jurisdiction = "" }: { placeholder?: string; autoFocus?: boolean; initialQuery?: string; clearOnNavigate?: boolean; state?: string; city?: string; jurisdiction?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [interacted, setInteracted] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [openList, setOpenList] = useState(false);
  const router = useRouter();
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const reset = useCallback(() => {
    setQuery(""); setSuggestions([]); setActive(-1); setOpenList(false); setInteracted(false);
  }, []);
  useEffect(() => {
    if (!clearOnNavigate) return;
    const onNavigation = (event: MouseEvent) => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (link && link.getAttribute('target') !== '_blank') reset();
    };
    // Clear before leaving as well as on history restoration: the router and
    // browser may preserve this homepage tree instead of remounting the input.
    document.addEventListener('click', onNavigation, true);
    window.addEventListener('pagehide', reset);
    window.addEventListener('pageshow', reset);
    window.addEventListener('popstate', reset);
    return () => {
      document.removeEventListener('click', onNavigation, true);
      window.removeEventListener('pagehide', reset);
      window.removeEventListener('pageshow', reset);
      window.removeEventListener('popstate', reset);
    };
  }, [clearOnNavigate, reset]);


  useEffect(() => {
    if (!interacted) return;
    const q = query.trim();
    if (q.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?${new URLSearchParams({ q, limit: "6", state, city, jurisdiction })}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (!controller.signal.aborted && Array.isArray(data.results)) {
          setSuggestions(data.results);
          trackTraffic(data.results.length?'search_results':'search_empty');
          setActive(-1);
          setOpenList(true);
        }
      } catch {
        // Autocomplete is best-effort; submitting still searches server-side.
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, state, city, jurisdiction, interacted]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpenList(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const q = query.trim();
          if (q) {
            trackTraffic('search_submit');
            if (clearOnNavigate) reset(); else setOpenList(false);
            router.push(`/search?${new URLSearchParams({ q, state, city, jurisdiction })}`);
          }
        }}
      >
        <label className="sr-only" htmlFor={`${listId}-input`}>
          Search restaurants, cities, or addresses
        </label>
        <div className="flex items-center gap-2 rounded-full border border-card-border bg-card px-4 py-2.5 transition-colors focus-within:border-nausea">
          <span className="shrink-0 text-xl" aria-hidden="true"><Face /></span>
          <input
            id={`${listId}-input`}
            type="search"
            value={query}
            onChange={(event) => { setInteracted(true); setQuery(event.target.value); setSuggestions([]); setActive(-1); }}
            onFocus={() => suggestions.length > 0 && setOpenList(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpenList(false);
              if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); setOpenList(true); setActive(a => (a + 1) % suggestions.length); }
              if (event.key === "ArrowUp" && suggestions.length) { event.preventDefault(); setOpenList(true); setActive(a => (a <= 0 ? suggestions.length : a) - 1); }
              if (event.key === "Enter" && openList && active >= 0 && suggestions[active]) { event.preventDefault(); const s = suggestions[active]; trackTraffic('search_result_click',`/restaurants/${s.stateSlug}/${s.slug}`); if (clearOnNavigate) reset(); else setOpenList(false); router.push(`/restaurants/${s.stateSlug}/${s.slug}`); }
            }}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={openList && suggestions.length > 0}
            aria-activedescendant={openList && active >= 0 ? `${listId}-${active}` : undefined}
            aria-controls={openList ? listId : undefined}
            className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-muted sm:text-base"
          />
          <button type="submit" className="shrink-0 rounded-full bg-nausea px-4 py-1.5 text-sm font-bold text-background transition-opacity hover:opacity-90">
            Search
          </button>
        </div>
      </form>
      {openList && suggestions.length > 0 && (
        <ul role="listbox" aria-label="Restaurant suggestions" id={listId} className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-xl border border-card-border bg-background shadow-2xl">
          {suggestions.map((s, index) => (
            <li id={`${listId}-${index}`} role="option" aria-selected={active === index} key={`${s.stateCode}-${s.slug}`} className={active === index ? "bg-card" : ""}>
              <Link
                href={`/restaurants/${s.stateSlug}/${s.slug}`}
                onClick={() => setOpenList(false)}
                className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-card"
              >
                <span className="font-semibold">{s.name}</span>
                <span className="text-right text-xs text-muted">
                  {[s.city, s.stateCode].filter(Boolean).join(", ")}{s.matchScope === "elsewhere" && <span className="mt-1 block text-nausea">Elsewhere in {s.stateCode}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
