interface LocatedCity {
  covered: boolean;
  latitude: number | null;
  longitude: number | null;
}

// Approximate proximity to a city reference point, not a jurisdiction boundary check.
// Visitor coordinates are used only in the browser and are never persisted.
export function nearbyCities<T extends LocatedCity>(latitude: number, longitude: number, cities: T[]): (T & { miles: number })[] {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
  const radians = (n: number) => n * Math.PI / 180;
  return cities.flatMap(city => {
    if (!city.covered || city.latitude === null || city.longitude === null || !Number.isFinite(city.latitude) || !Number.isFinite(city.longitude) || Math.abs(city.latitude) > 90 || Math.abs(city.longitude) > 180) return [];
    const a = Math.sin(radians(city.latitude - latitude) / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(city.latitude)) * Math.sin(radians(city.longitude - longitude) / 2) ** 2;
    const miles = 3958.8 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    return miles <= 50 ? [{ ...city, miles }] : [];
  }).sort((a, b) => a.miles - b.miles).slice(0, 3);
}
