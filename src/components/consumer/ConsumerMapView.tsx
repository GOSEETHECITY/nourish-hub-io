import { useMemo, useState, Component, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "@/lib/mapConfig";

interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "restaurant" | "event" | "flash";
  subtitle?: string;
}

interface MapViewProps {
  center: [number, number];
  markers: MapLocation[];
  onMarkerClick: (id: string) => void;
}

function PinSvg({ color }: { color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42">
      <path
        d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 28 14 28s14-17.5 14-28C28 6.3 21.7 0 14 0z"
        fill={color}
        stroke="#fff"
        strokeWidth="1.5"
      />
      <circle cx="14" cy="14" r="6" fill="#fff" />
    </svg>
  );
}

const colorFor = (t: MapLocation["type"]) =>
  t === "event" ? "#8DC63F" : t === "flash" ? "#EF4444" : "#F97316";
const labelFor = (t: MapLocation["type"]) =>
  t === "event" ? "Event" : t === "flash" ? "Flash rescue" : "Restaurant";
const btnClassFor = (t: MapLocation["type"]) =>
  t === "event" ? "bg-[#8DC63F]" : t === "flash" ? "bg-[#EF4444]" : "bg-[#F97316]";

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

/* ── inner map component rendered by the boundary ── */
function ConsumerMap({ center, markers, onMarkerClick }: MapViewProps) {
  const [selected, setSelected] = useState<MapLocation | null>(null);
  const style = useMemo(() => getMapStyle(), []);

  return (
    <div className="consumer-static-map h-full w-full overflow-hidden rounded-[28px] bg-muted">
      <Map
        initialViewState={{
          latitude: center[0],
          longitude: center[1],
          zoom: 13,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={style}
        dragPan={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        dragRotate={false}
        boxZoom={false}
        keyboard={false}
        onError={(e) => console.error("Map error:", e?.error?.message || e)}
      >
        <NavigationControl showCompass={false} position="top-left" />
        {markers.map((m) => (
          <Marker
            key={`${m.type}-${m.id}`}
            latitude={m.lat}
            longitude={m.lng}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected(m);
            }}
          >
            <div className="cursor-pointer" style={{ transform: "translate(-50%, -100%)" }}>
              <PinSvg color={colorFor(m.type)} />
            </div>
          </Marker>
        ))}
        {selected && (
          <Popup
            latitude={selected.lat}
            longitude={selected.lng}
            anchor="bottom"
            closeButton={false}
            closeOnClick={false}
            onClose={() => setSelected(null)}
            offset={[0, -42]}
          >
            <div className="text-center min-w-[140px]">
              <p className="font-semibold text-sm">{selected.name}</p>
              <p className="text-xs text-gray-500">{selected.subtitle ?? labelFor(selected.type)}</p>
              <button
                onClick={() => onMarkerClick(selected.id)}
                className={`mt-2 px-3 py-1 text-white rounded-full text-xs font-semibold ${btnClassFor(selected.type)}`}
              >
                View
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

/* ── public wrapper: catches errors and shows loading state ── */
export default function ConsumerMapView({ center, markers, onMarkerClick }: MapViewProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="h-full w-full flex items-center justify-center pt-16">
        <p className="text-gray-400 text-sm">Map could not be loaded.</p>
      </div>
    );
  }

  // We keep a lightweight loading state while the map library initializes.
  // react-map-gl renders the map synchronously, so this is mostly for data fetching.
  if (!center) {
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
      <ConsumerMap
        center={center}
        markers={markers}
        onMarkerClick={onMarkerClick}
      />
    </MapErrorBoundary>
  );
}
