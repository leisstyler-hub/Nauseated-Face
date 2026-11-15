import type { MetadataRoute } from "next";
import { getCoveredCities, getStates } from "@/lib/locations";
import { openSiteStore, savedStorageEnabled } from "../../backend/production.mjs";

const BASE = "https://nauseated-face.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/search`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/inspections`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/locations`, changeFrequency: "weekly", priority: 0.7 },
    ...["about", "methodology", "corrections", "contact", "privacy", "terms"].map((path) => ({
      url: `${BASE}/${path}`,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
  const states = await getStates();
  for (const state of states) {
    if (state.cities.some(city => city.covered)) entries.push({ url: `${BASE}/${state.slug}`, changeFrequency: "weekly", priority: 0.7 });
  }
  // Only cities and profiles with real saved records are indexed — no thin
  // pages for markets we have not verified.
  try {
    const covered = await getCoveredCities();
    const stateByCode = new Map(states.map((s) => [s.code, s]));
    for (const c of covered) {
      const state = stateByCode.get(c.stateCode);
      const city = state?.cities.find((entry) => entry.name.toLowerCase() === c.city.toLowerCase());
      if (state && city) entries.push({ url: `${BASE}/${state.slug}/${city.slug}`, changeFrequency: "daily", priority: 0.8 });
    }
    if (savedStorageEnabled()) {
      const store = openSiteStore();
      try {
        for (const profile of await store.establishmentSlugs()) {
          const state = stateByCode.get(profile.stateCode);
          if (state) entries.push({ url: `${BASE}/restaurants/${state.slug}/${profile.slug}`, changeFrequency: "weekly", priority: 0.6 });
        }
      } finally {
        await store.close();
      }
    }
  } catch {
    // Static entries above remain valid even if storage is unreachable.
  }
  return entries;
}
