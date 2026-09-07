/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PMTILES_URL?: string;
  readonly VITE_MAP_STYLE_URL?: string;
  readonly VITE_USE_VERSATILES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
