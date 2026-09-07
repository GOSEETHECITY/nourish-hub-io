import { useEffect, useState, Component, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { formatTime, formatDateShort } from "@/lib/formatters";
import Map, { Marker, Popup, NavigationControl, AttributionControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle, getMapAttribution } from "@/lib/mapConfig";

// City center coordinates for initial map view
const CITY_CENTERS: Record<string, [number, number]> = {
  Atlanta: [33.749, -84.388],
  Orlando: [28.5383, -81.3792],
  Miami: [25.7617, -80.1918],
  Tampa: [27.9506, -82.4572],
  Jacksonville: [30.3322, -81.6557],
  "New York": [40.7128, -74.006],
  "Los Angeles": [34.0522, -118.2437],
  Chicago: [41.8781, -87.6298],
  Houston: [29.7604, -95.3698],
  Dallas: [32.7767, -96.797],
  Charlotte: [35.2271, -80.8431],
  "San Francisco": [37.7749, -122.4194],
  Seattle: [47.6062, -122.3321],
  Denver: [39.7392, -104.9903],
  Nashville: [36.1627, -86.7816],
  Austin: [30.2672, -97.7431],
  Phoenix: [33.4484, -112.074],
  "Washington DC": [38.9072, -77.0369],
  Philadelphia: [39.9526, -75.1652],
  "San Antonio": [29.4241, -98.4936],
  Detroit: [42.3314, -83.0458],
};

interface EventsMapProps {
  events: any[];
  city: string;
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
  const attribution = getMapAttribution();

  return (
    <Map
      initialViewState={{
        latitude: center[0],
        longitude: center[1],
        zoom: 11,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={style}
      scrollZoom={false}
    >
      <NavigationControl showCompass={false} position="top-right" />
      <AttributionControl position="bottom-right" customAttribution={attribution} />
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

/* ── Public wrapper: geocodes events, loads MapLibre ── */
export default function EventsMap({ events, city }: EventsMapProps) {
  const [geocoded, setGeocoded] = useState<GeocodedEvent[]>([]);

  const center: [number, number] = CITY_CENTERS[city] || [33.749, -84.388];

  // Geocode event addresses
  useEffect(() => {
    let cancelled = false;

    const geocodeEvents = async () => {
      const results: GeocodedEvent[] = [];

      for (const ev of events) {
        if (cancelled) break;
        const addr = [ev.address, ev.city, ev.state]
          .filter(Boolean)
          .join(", ");
        if (!addr) continue;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`
          );
          const data = await res.json();
          if (data && data.length > 0) {
            results.push({
              event: ev,
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            });
          }
        } catch {
          // skip failed geocodes
        }

        // Respect Nominatim rate limit (1 req/sec)
        await new Promise((r) => setTimeout(r, 1100));
      }

      if (!cancelled) setGeocoded(results);
    };

    if (events.length > 0) {
      geocodeEvents();
    } else {
      setGeocoded([]);
    }

    return () => {
      cancelled = true;
    };
  }, [events]);

  return (
    <MapErrorBoundary>
      <div className="w-full h-48 rounded-xl overflow-hidden shadow-md mb-4">
        <EventsMapInner center={center} geocoded={geocoded} />
      </div>
    </MapErrorBoundary>
  );
}
