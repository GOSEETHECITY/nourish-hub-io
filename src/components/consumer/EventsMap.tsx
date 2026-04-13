import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatTime, formatDateShort } from "@/lib/formatters";

// Fix Leaflet default marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

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

const EventsMap = ({ events, city }: EventsMapProps) => {
  const navigate = useNavigate();
  const [geocoded, setGeocoded] = useState<GeocodedEvent[]>([]);

  const center = useMemo(
    () => CITY_CENTERS[city] || [33.749, -84.388],
    [city]
  );

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
    <div className="w-full h-48 rounded-xl overflow-hidden shadow-md mb-4">
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
    </div>
  );
};

export default EventsMap;
