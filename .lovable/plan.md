# Fix "API KEY REQUIRED" map watermark

## Why it appears

The home-screen map (`/app/home`) loads its map tiles from CARTO (`basemaps.cartocdn.com`) in `src/components/consumer/ConsumerMapView.tsx`. CARTO no longer serves those raster tiles without an API key, so every tile comes back stamped with the "API KEY REQUIRED" watermark seen in the screenshot. The events map already uses free OpenStreetMap tiles and is unaffected.

## Fix

- In `ConsumerMapView.tsx`, swap the CARTO tile URL for the same free OpenStreetMap tile URL already used in `EventsMap.tsx` (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`), keeping the existing attribution line.
- No API keys, accounts, or cost involved; no other behavior changes.

## Verification

- Typecheck passes.
- Playwright check of `/app/home` confirms the map renders with clean tiles and no watermark.
