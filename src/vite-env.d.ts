/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PMTILES_URL?: string; // self-hosted Protomaps PMTiles URL (requires CORS)
  readonly VITE_MAP_STYLE_URL?: string; // custom MapLibre style URL
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
