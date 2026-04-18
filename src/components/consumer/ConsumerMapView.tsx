import { useEffect, useState, Component, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "restaurant" | "event";
}

interface MapViewProps {
  center: [number, number];
  markers: MapLocation[];
  onMarkerClick: (id: string) => void;
}

/* ── local error boundary so map crashes never bubble up ── */
class MapErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.error("MapErrorBoundary caught:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-gray-50">
          <p className="text-gray-400 text-sm">Map unavailable — please reload.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── inner map component, only rendered once leaflet is loaded ── */
function LeafletMap({ center, markers, onMarkerClick, modules }: MapViewProps & { modules: any }) {
  const { MapContainer, TileLayer, Marker, Popup, orangeIcon, greenIcon } = modules;

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      tap={false}
      bounceAtZoomLimits={false}
      attributionControl={false}
      className="consumer-static-map relative z-0"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={m.type === "event" ? greenIcon : orangeIcon}>
          <Popup autoPan={false}>
            <div className="text-center">
              <p className="font-semibold">{m.name}</p>
              <p className="text-xs text-gray-500">{m.type === "event" ? "Event" : "Restaurant"}</p>
              <button
                onClick={() => onMarkerClick(m.id)}
                className={`mt-1 px-3 py-1 text-white rounded-full text-xs font-semibold ${
                  m.type === "event" ? "bg-[#8DC63F]" : "bg-[#F97316]"
                }`}
              >
                View
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

/* ── public wrapper: lazy-loads Leaflet, catches errors ── */
export default function ConsumerMapView({ center, markers, onMarkerClick }: MapViewProps) {
  const [modules, setModules] = useState<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // Import Leaflet core + CSS
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        // Fix default marker icons (Vite may return module objects)
        const resolve = (mod: any) =>
          typeof mod === "string" ? mod : mod?.default ?? mod;

        const iconUrl = resolve(
          await import("leaflet/dist/images/marker-icon.png")
        );
        const iconRetinaUrl = resolve(
          await import("leaflet/dist/images/marker-icon-2x.png")
        );
        const shadowUrl = resolve(
          await import("leaflet/dist/images/marker-shadow.png")
        );

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

        const makeSvgIcon = (color: string) => {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42">
            <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 28 14 28s14-17.5 14-28C28 6.3 21.7 0 14 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
            <circle cx="14" cy="14" r="6" fill="#fff"/>
          </svg>`;
          return L.divIcon({
            html: svg,
            className: "",
            iconSize: [28, 42],
            iconAnchor: [14, 42],
            popupAnchor: [0, -36],
          });
        };

        const orangeIcon = makeSvgIcon("#F97316");
        const greenIcon = makeSvgIcon("#8DC63F");

        // Import react-leaflet and destructure named exports explicitly
        const RL = await import("react-leaflet");
        const MapContainer = RL.MapContainer;
        const TileLayer = RL.TileLayer;
        const Marker = RL.Marker;
        const Popup = RL.Popup;

        if (!cancelled) {
          setModules({ MapContainer, TileLayer, Marker, Popup, orangeIcon, greenIcon });
        }
      } catch (err) {
        console.error("Failed to load map:", err);
        if (!cancelled) setFailed(true);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  if (failed) {
    return (
      <div className="h-full w-full flex items-center justify-center pt-16">
        <p className="text-gray-400 text-sm">Map could not be loaded.</p>
      </div>
    );
  }

  if (!modules) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 pt-16">
        <Skeleton className="w-3/4 h-4" />
        <Skeleton className="w-1/2 h-4" />
        <Skeleton className="w-full h-[60vh] rounded-xl mx-4" />
        <p className="text-sm text-gray-400">Loading map...</p>
      </div>
    );
  }

  return (
    <MapErrorBoundary>
      <LeafletMap
        center={center}
        markers={markers}
        onMarkerClick={onMarkerClick}
        modules={modules}
      />
    </MapErrorBoundary>
  );
}
