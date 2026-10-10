import { useMemo, useState, Component, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { formatTime, formatDateShort } from "@/lib/formatters";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "@/lib/mapConfig";
import { useCityCenter } from "@/lib/cityCenter";
import MapCredit from "@/components/consumer/MapCredit";

interface EventsMapProps {
  events: any[];
  city: string;
  state?: string;
}

interface GeocodedEvent {
  event: any;
  lat: number;
  lng: number;
}

function PinSvg({ color }: { color: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 28 42">
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

/* ── Error boundary so map crashes never bubble up ── */
class MapErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/* ── Inner map rendered after geocoding completes ── */
function EventsMapInner({
  center,
  geocoded,
}: {
  center: [number, number];
  geocoded: GeocodedEvent[];
}) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<GeocodedEvent | null>(null);
  const style = getMapStyle();

  return (
    <Map
      initialViewState={{
        latitude: center[0],
        longitude: center[1],
        zoom: 11,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={style}
      attributionControl={false}
      scrollZoom={false}
      onError={(e) => console.error("Events map error:", e?.error?.message || e)}
    >
      <NavigationControl showCompass={false} position="top-right" />
      <MapCredit />
      {geocoded.map((g) => (
        <Marker
          key={g.event.id}
          latitude={g.lat}
          longitude={g.lng}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelected(g);
          }}
        >
          <div className="cursor-pointer" style={{ transform: "translate(-50%, -100%)" }}>
            <PinSvg color="#8DC63F" />
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
          offset={[0, -36]}
        >
          <div
            className="cursor-pointer min-w-[160px]"
            onClick={() => navigate(`/app/event/${selected.event.id}`)}
          >
            <p className="font-semibold text-sm">{selected.event.title}</p>
            {selected.event.event_date && (
              <p className="text-xs text-gray-500">
                {formatDateShort(selected.event.event_date)}
                {selected.event.start_time && ` · ${formatTime(selected.event.start_time)}`}
              </p>
            )}
          </div>
        </Popup>
      )}
    </Map>
  );
}

/* ── Public wrapper: uses each event's stored coordinates ── */
export default function EventsMap({ events, city, state = "" }: EventsMapProps) {
  const center = useCityCenter(city, state);

  const geocoded = useMemo<GeocodedEvent[]>(
    () =>
      events
        .filter((ev) => ev.latitude != null && ev.longitude != null)
        .map((ev) => ({ event: ev, lat: Number(ev.latitude), lng: Number(ev.longitude) })),
    [events]
  );

  if (!center) return <div className="w-full h-48 rounded-xl bg-gray-50 mb-4" aria-hidden />;

  return (
    <MapErrorBoundary>
      <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-md mb-4">
        <EventsMapInner key={`${center[0]},${center[1]}`} center={center} geocoded={geocoded} />
      </div>
    </MapErrorBoundary>
  );
}
