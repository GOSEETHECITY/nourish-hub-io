import { useEffect, useState } from "react";

// Known city centers (instant, no lookup). Other cities are looked up once and cached.
const CITY_CENTERS: Record<string, [number, number]> = {
  "Atlanta, GA": [33.749, -84.388],
  "Orlando, FL": [28.5383, -81.3792],
  "Miami, FL": [25.7617, -80.1918],
  "Tampa, FL": [27.9506, -82.4572],
  "Jacksonville, FL": [30.3322, -81.6557],
  "St. Petersburg, FL": [27.7676, -82.6403],
  "Hernando, FL": [28.8946, -82.376],
  "Dunedin, FL": [28.0197, -82.7723],
  "Rogers, AR": [36.332, -94.1185],
  "Lowell, AR": [36.2562, -94.1316],
  "Ashland, OH": [40.8689, -82.3187],
  "Hampton, GA": [33.3879, -84.2828],
  "Seattle, WA": [47.6062, -122.3321],
  "St. Louis, MO": [38.627, -90.1994],
  "Minneapolis, MN": [44.9778, -93.265],
  "Albuquerque, NM": [35.0844, -106.6504],
  "Austin, TX": [30.2672, -97.7431],
};

// Nominatim usage policy: one lookup per city, cached on the device for 30 days.
const GEOCODE_CACHE_KEY = "gstc_geocode_cache_v1";
const GEOCODE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const geocodeMemory = new Map<string, Promise<{ lat: number; lng: number } | null>>();

function readGeocodeCache(): Record<string, { lat: number; lng: number; t: number } | { miss: true; t: number }> {
  try { return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || "{}"); } catch { return {}; }
}

export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
  const hit = readGeocodeCache()[key];
  if (hit && Date.now() - hit.t < GEOCODE_CACHE_TTL_MS) return "miss" in hit ? null : { lat: hit.lat, lng: hit.lng };
  if (geocodeMemory.has(key)) return geocodeMemory.get(key)!;
  const p = (async () => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
        {
          headers: { "User-Agent": "GOSeeTheCity/1.0 (https://goseethecity.com; hello@goseethecity.com)", Accept: "application/json" },
          referrerPolicy: "strict-origin-when-cross-origin",
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const result = data?.[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
      const next = readGeocodeCache();
      next[key] = result ? { ...result, t: Date.now() } : { miss: true, t: Date.now() };
      try { localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(next)); } catch {}
      return result;
    } catch {
      return null;
    }
  })();
  geocodeMemory.set(key, p);
  return p;
}

/** Real center of the selected city; null until known. Never falls back to another city. */
export function useCityCenter(city: string, state: string, ready = true): [number, number] | null {
  const key = `${city}, ${state}`;
  const [center, setCenter] = useState<[number, number] | null>(() => (ready && CITY_CENTERS[key]) || null);
  useEffect(() => {
    if (!ready || !city) return;
    const known = CITY_CENTERS[key];
    if (known) { setCenter(known); return; }
    let cancelled = false;
    geocode(state ? `${city}, ${state}` : city).then((c) => {
      if (!cancelled && c) setCenter([c.lat, c.lng]);
    });
    return () => { cancelled = true; };
  }, [city, state, key, ready]);
  return center;
}
