# Replace map basemap with a free commercial-use vector option

## Goal
Swap the current map implementation to use a clean, light-colored vector basemap that is genuinely free for commercial use, with no API key required.

## Why not Stadia Maps
Stadia Maps' free tier is restricted to development, evaluation, and non-commercial use. Because this app is a commercial consumer product, a paid subscription would be required. We should avoid that.

## Recommended approach

**Primary: Protomaps self-hosted**
- Free and open-source, commercial use allowed, no API key.
- Clean, light vector basemap styles that work with MapLibre GL.
- Host a single `.pmtiles` file on cloud object storage (e.g., Cloudflare R2, S3-compatible).
- Full planet builds are ~128 GB, but we can extract a US-only region using `pmtiles extract` with a GeoJSON boundary, which keeps the hosted file much smaller.
- MapLibre reads PMTiles directly via the `pmtiles` JS protocol plugin.

**Alternative: VersaTiles public server**
- Free public vector tile server at `tiles.versatiles.org` with no API key.
- Pre-built styles include tiles, fonts, and icons.
- Simplest setup, but it is a shared public service with no SLA.

## Implementation

1. **Dependencies**
   - Keep `maplibre-gl` and `react-map-gl`.
   - Add `pmtiles` package for the PMTiles protocol.
   - Remove `leaflet`, `react-leaflet`, and `@types/leaflet` if no longer used.

2. **PMTiles source**
   - Obtain or generate a US-region `.pmtiles` extract from Protomaps builds.
   - Host it at a public URL (e.g., `https://<your-cdn>/us.pmtiles`).
   - For this implementation, use the Protomaps daily planet URL or a provided regional URL as the default, with documentation on how to swap in a self-hosted file.

3. **Rebuild `ConsumerMapView.tsx`**
   - Replace the Stadia style URL with a MapLibre style pointing at the PMTiles source.
   - Register the `pmtiles` protocol before map initialization.
   - Preserve the orange/green/red SVG markers, popups, and `onMarkerClick` behavior.
   - Keep the error boundary and loading skeleton.

4. **Rebuild `EventsMap.tsx`**
   - Use the same Protomaps basemap setup.
   - Preserve event markers and the Nominatim geocoding fallback.

5. **Attribution**
   - Ensure OpenStreetMap / Protomaps attribution is visible per the license terms.

## Verification
- Typecheck passes.
- `/app/home` renders the clean vector basemap, markers, and popups correctly.
- `/app/events` renders the same basemap and event markers correctly.
- No runtime errors in the map error boundary.
- No API key or watermark is required.
