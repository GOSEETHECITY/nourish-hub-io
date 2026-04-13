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
    <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} zoomControl={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={m.type === "event" ? greenIcon : orangeIcon}>
          <Popup>
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

        const makeIcon = (className: string) =>
          new L.Icon({
            iconUrl,
            iconRetinaUrl,
            shadowUrl,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
            className,
          });

        const orangeIcon = makeIcon("map-marker-orange");
        const greenIcon = makeIcon("map-marker-green");

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
