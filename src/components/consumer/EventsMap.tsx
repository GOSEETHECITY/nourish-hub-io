import { useEffect, useState, Component, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { formatTime, formatDateShort } from "@/lib/formatters";

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

/* ── Inner map rendered only after leaflet loads ── */
function LeafletEventsMap({
  center,
  geocoded,
  modules,
}: {
  center: [number, number];
  geocoded: GeocodedEvent[];
  modules: any;
}) {
  const navigate = useNavigate();
  const { MapContainer, TileLayer, Marker, Popup } = modules;

  return (
    <MapContainer
      key={`${center[0]}-${center[1]}`}
      center={center}
      zoom={11}
      scrollWheelZoom={false}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {geocoded.map((g) => (
        <Marker key={g.event.id} position={[g.lat, g.lng]}>
          <Popup>
            <div
              className="cursor-pointer"
              onClick={() => navigate(`/app/event/${g.event.id}`)}
            >
              <p className="font-semibold text-sm">{g.event.title}</p>
              {g.event.event_date && (
                <p className="text-xs text-gray-500">
                  {formatDateShort(g.event.event_date)}
                  {g.event.start_time &&
                    ` · ${formatTime(g.event.start_time)}`}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

/* ── Public wrapper: lazy-loads Leaflet, geocodes events ── */
export default function EventsMap({ events, city }: EventsMapProps) {
  const [modules, setModules] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [geocoded, setGeocoded] = useState<GeocodedEvent[]>([]);

  const center: [number, number] = CITY_CENTERS[city] || [33.749, -84.388];

  // Lazy-load Leaflet + react-leaflet (same pattern as ConsumerMapView)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

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

        const RL = await import("react-leaflet");

        if (!cancelled) {
          setModules({
            MapContainer: RL.MapContainer,
            TileLayer: RL.TileLayer,
            Marker: RL.Marker,
            Popup: RL.Popup,
          });
        }
      } catch (err) {
        console.error("Failed to load map:", err);
        if (!cancelled) setFailed(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (failed) return null;

  if (!modules) {
    return (
      <div className="w-full h-48 rounded-xl overflow-hidden shadow-md mb-4 bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading map...</p>
      </div>
    );
  }

  return (
    <MapErrorBoundary>
      <div className="w-full h-48 rounded-xl overflow-hidden shadow-md mb-4">
        <LeafletEventsMap
          center={center}
          geocoded={geocoded}
          modules={modules}
        />
      </div>
    </MapErrorBoundary>
  );
}
