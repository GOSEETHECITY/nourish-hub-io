# Replace OpenStreetMap tiles with a clean vector basemap

## Goal
Swap the cluttered OpenStreetMap raster tiles on `/app/home` and `/app/events` for a clean, light-colored vector basemap that looks closer to Google Maps, using MapLibre GL.

## Recommended provider

**Primary: Stadia Maps Alidade Smooth (vector)**
- Light, muted style with fewer points of interest — ideal for overlaid markers.
- Free tier includes vector tiles and MapLibre GL support [2](https://docs.stadiamaps.com/map-styles/alidade-smooth/).
- Under your expected 100k tiles/month, the free tier is sufficient.
- Requires a free API key and attribution.

**Why not MapTiler free tier?** MapTiler's free plan is explicitly limited to "testing, personal or non-commercial use" [1](https://www.maptiler.com/cloud/pricing/), so it is not suitable for a public commercial app.

**No-API-key fallback: Protomaps (self-hosted)**
- Completely free/open-source, no API key, commercial use allowed.
- Requires hosting a `.pmtiles` file and adding the `pmtiles` protocol to MapLibre.
- More setup; can be evaluated after the Stadia implementation if you want to eliminate keys entirely.

## Implementation

1. **Dependencies**
   - Add `maplibre-gl` and `react-map-gl` (MapLibre React bindings) or use `maplibre-gl` directly.
   - Remove `leaflet`, `react-leaflet`, and `@types/leaflet` if no longer used elsewhere.

2. **Environment variable**
   - Add `VITE_STADIA_MAPS_API_KEY` for the client-side Stadia key.

3. **Rebuild `ConsumerMapView.tsx`**
   - Replace the Leaflet lazy-load and `MapContainer`/`TileLayer` with a `MapLibre` map.
   - Use Stadia vector style URL: `https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=...`
   - Recreate the orange/green/red SVG markers as MapLibre markers.
   - Preserve popup content and `onMarkerClick` behavior.
   - Keep the error boundary and loading skeleton.

4. **Rebuild `EventsMap.tsx`**
   - Replace Leaflet with the same MapLibre + Stadia Alidade Smooth setup.
   - Keep the Nominatim geocoding fallback for events without stored coordinates.

5. **Update `ConsumerHome.tsx` if needed**
   - The data fetching logic stays the same; only the map component props may need minor adjustments.

6. **Attribution**
   - Ensure Stadia Maps / OpenStreetMap attribution is visible per their terms.

## Verification
- Typecheck passes.
- `/app/home` renders with the light Stadia basemap, no OSM clutter, and markers/popups work.
- `/app/events` renders the same basemap and event markers correctly.
- No runtime errors in the map error boundary.
