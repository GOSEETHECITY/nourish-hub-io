# Fix the blank map

## What's happening

The map area loads (zoom buttons, the beige background, and the credit line at the bottom all appear), but no streets, water, or place names ever draw. I checked the map data service directly: it is online, returns real map data for Tampa, and allows the app to use it. So the problem is not the map provider.

That points at the map software itself. The app currently uses a very new version of the map engine (MapLibre 6) together with a wrapper library that was built and tested for the previous version (MapLibre 5). We already hit one symptom of this mismatch earlier: a standard piece of the wrapper (the credits control) simply did not exist and had to be removed. A blank canvas that paints only the background color is the classic result of this kind of version mismatch.

## The fix

1. Move the map engine back to the version the wrapper officially supports (MapLibre 5.x), keeping everything else the same.
2. Keep the current basemap and settings; no visual redesign, no change to pins, popups, or the city logic.
3. Add a one-line error log if the map reports a loading failure, so any future blank map tells us why instead of failing silently.
4. Verify: load the home map and the events map in a real browser session, confirm streets and labels render around Tampa and Orlando, confirm pins and popups still work, then run the type check, build, and tests.

If the downgrade does not bring the streets back, the fallback is to render the map with the map engine directly (no wrapper), which removes the compatibility layer entirely. I would report back before taking that route.

## Technical notes

- Pin `maplibre-gl` to `^5` (react-map-gl 8.1 peer-tested pairing); `react-map-gl@8.1.3` stays.
- Files touched: `package.json` (dependency), `src/components/consumer/ConsumerMapView.tsx` and `src/components/consumer/EventsMap.tsx` (add `onError` logging only).
- `src/lib/mapConfig.ts` is unchanged: VersaTiles style stays the default, `VITE_PMTILES_URL` / `VITE_MAP_STYLE_URL` overrides stay available.
- Confirmed by direct request: style JSON 200, vector tiles at z13 over Tampa return 12-15 KB with `access-control-allow-origin: *`.
