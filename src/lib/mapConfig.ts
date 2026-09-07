import { layers, LIGHT } from "@protomaps/basemaps";
import { Protocol } from "pmtiles";
import { addProtocol } from "maplibre-gl";

const PROTOCOL_NAME = "pmtiles";
let protocolRegistered = false;

export function registerPmtilesProtocol() {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  addProtocol(PROTOCOL_NAME, protocol.tile);
  protocolRegistered = true;
}

const VERSATILES_STYLE_URL =
  "https://tiles.versatiles.org/assets/styles/colorful/style.json";

function protomapsLightStyle(pmtilesUrl: string) {
  return {
    version: 8 as const,
    glyphs: "https://cdn.protomaps.com/fonts/pbf/{fontstack}/{range}.pbf",
    sprite: "https://protomaps.github.io/basemaps-assets/sprites/v3/light",
    sources: {
      protomaps: {
        type: "vector" as const,
        url: `pmtiles://${pmtilesUrl}`,
        attribution:
          '© <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors / © <a href="https://protomaps.com" target="_blank">Protomaps</a>',
      },
    },
    layers: layers("protomaps", LIGHT),
  };
}

export function getMapStyle() {
  const customStyleUrl = import.meta.env.VITE_MAP_STYLE_URL;
  if (customStyleUrl) {
    return customStyleUrl;
  }

  const pmtilesUrl = import.meta.env.VITE_PMTILES_URL;
  if (pmtilesUrl) {
    registerPmtilesProtocol();
    return protomapsLightStyle(pmtilesUrl);
  }

  // Default: VersaTiles public style (CORS-enabled, free commercial use).
  return VERSATILES_STYLE_URL;
}

export function getMapAttribution() {
  if (import.meta.env.VITE_MAP_STYLE_URL || import.meta.env.VITE_USE_VERSATILES === "true") {
    return '© <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors / © <a href="https://versatiles.org" target="_blank">VersaTiles</a>';
  }
  return '© <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors / © <a href="https://protomaps.com" target="_blank">Protomaps</a>';
}
