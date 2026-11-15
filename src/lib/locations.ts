import { connection } from "next/server";
import { cache } from "react";
import { JURISDICTIONS } from "../../backend/jurisdictions.mjs";
import { openSiteStore, savedStorageEnabled } from "../../backend/production.mjs";
import { buildLocationCatalog, canonicalCityKey } from "../../backend/location-catalog.mjs";

export type CoverageStatus = "available" | "limited" | "coming_soon" | "unavailable";

export const STATUS_LABEL: Record<CoverageStatus, string> = {
  available: "Data Available",
  limited: "Limited Coverage",
  coming_soon: "Coming Soon",
  unavailable: "Temporarily Unavailable",
};

export interface CityEntry {
  name: string;
  slug: string;
  status: CoverageStatus;
  jurisdictionId: string;
  jurisdictionName: string;
  healthAuthority: string;
  sourceUrl: string;
  covered: boolean;
  inspectionCount: number;
  establishmentCount: number;
  firstInspectionDate: string | null;
  lastInspectionDate: string | null;
  lastRefreshed: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface StateEntry {
  code: string;
  name: string;
  slug: string;
  cities: CityEntry[];
}

export interface Establishment {
  id: string;
  jurisdictionId: string;
  officialId: string;
  name: string;
  address: string | null;
  city: string | null;
  stateCode: string;
  zip: string | null;
  slug: string;
  latestInspectionDate: string | null;
  latestResult: string | null;
  latestScore: string | null;
  inspectionCount: number;
}

interface JurisdictionDef {
  id: string;
  stateCode: string;
  stateName: string;
  name: string;
  healthAuthority: string;
  sourceUrl: string;
  coverageStatus: CoverageStatus;
  enabled: boolean;
  cities: string[];
}

const registry = JURISDICTIONS as JurisdictionDef[];

const getLocationData = cache(async () => withStore(store => Promise.all([store.coveredCities(),store.catalog()]),[[],[]]));
export interface SourceCoverage {id:string;name:string;healthAuthority:string;sourceUrl:string;stateName:string;enabled:boolean;coverageStatus:CoverageStatus;inspectionCount:number;establishmentCount:number;firstInspectionDate:string|null;lastInspectionDate:string|null;lastSuccess:string|null;fullImportVerified:boolean;lastAttemptStatus:string|null}
export const getSourceCoverage = cache(async ():Promise<SourceCoverage[]> => {await connection();const [,catalog]=await getLocationData();return catalog;});

// The geographic catalog is registry-driven: states and cities come from the
// jurisdiction registry, never from hardcoded frontend lists.
export const getStates = cache(async (): Promise<StateEntry[]> => {
  await connection();
  const [covered,catalog] = await getLocationData().catch(() => [[],[]]);

  return buildLocationCatalog(registry, covered, catalog) as StateEntry[];
});

export const findState = async (slug: string) => (await getStates()).find((s) => s.slug === slug) ?? null;

export const findCity = (state: StateEntry, slug: string) => state.cities.find((c) => c.slug === canonicalCityKey(state.code, slug)) ?? null;

export const DEFAULT_LOCATION = { stateSlug: "washington", citySlug: "seattle", label: "Seattle, WA" };

async function withStore<T>(action: (store: Awaited<ReturnType<typeof openSiteStore>>) => Promise<T>, fallback: T): Promise<T> {
  if (!savedStorageEnabled()) return fallback;
  const store = openSiteStore();
  try {
    return await action(store);
  } finally {
    await store.close();
  }
}

export const searchEstablishments = cache(
  (q: string, state = "", city = "", offset = 0, sort = "date", jurisdictionId = ""): Promise<Establishment[]> =>
    withStore((store) => store.searchEstablishments({ q, stateCode: state, city, limit: 21, offset, sort, jurisdictionId }), []),
);

export const getCityEstablishments = cache(
  (stateCode: string, city: string, limit = 60): Promise<Establishment[]> =>
    withStore((store) => store.cityEstablishments(stateCode, city, limit), []),
);

export const getCoveredCities = cache(
  (): Promise<{ stateCode: string; city: string; jurisdictionId: string; establishmentCount: number }[]> =>
    withStore((store) => store.coveredCities(), []),
);

export const getEstablishmentProfile = cache(
  (
    stateCode: string,
    slug: string,
  ): Promise<
    | (Establishment & {
        jurisdiction: { id: string; name: string; healthAuthority: string; sourceUrl: string; scoring: { type: string }; coverageStatus: CoverageStatus } | null;
        inspections: { id: string; businessId: string; serial: string; inspectionDate: string | null; fields: Record<string, string>; rowCount: number; violations: {description: string | null; type: string | null; points: string | null}[]; observedAt: string | null; stale: boolean; sourceUrl: string }[];
      })
    | null
  > => withStore((store) => store.establishmentBySlug(stateCode, slug), null),
);
