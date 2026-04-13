import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerAppHeader from "@/components/consumer/ConsumerAppHeader";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";
import ConsumerMapView from "@/components/consumer/ConsumerMapView";

interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "restaurant" | "event";
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
    );
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

const ConsumerHome = () => {
  const navigate = useNavigate();
  const [center, setCenter] = useState<[number, number]>([33.749, -84.388]);
  const [markers, setMarkers] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Map always centers on Atlanta, GA (matches header city selector)

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch restaurant locations
        const { data: locs } = await supabase
          .from("locations")
          .select("id, name, latitude, longitude")
          .eq("approval_status", "approved")
          .eq("marketplace_enabled", true);
        const locMarkers: MapLocation[] = (locs || [])
          .filter((l) => l.latitude && l.longitude)
          .map((l) => ({
            id: l.id,
            name: l.name,
            lat: l.latitude!,
            lng: l.longitude!,
            type: "restaurant" as const,
          }));

        // Fetch published events and geocode their addresses
        const today = new Date().toISOString().split("T")[0];
        const { data: events } = await supabase
          .from("events")
          .select("id, title, address, city, state")
          .eq("status", "published")
          .gte("event_date", today);

        const eventMarkers: MapLocation[] = [];
        for (const ev of events || []) {
          const fullAddress = [ev.address, ev.city, ev.state].filter(Boolean).join(", ");
          if (!fullAddress) continue;
          const coords = await geocode(fullAddress);
          if (coords) {
            eventMarkers.push({
              id: ev.id,
              name: ev.title,
              lat: coords.lat,
              lng: coords.lng,
              type: "event" as const,
            });
          }
          // Nominatim rate limit: 1 req/sec
          await new Promise((r) => setTimeout(r, 1100));
        }

        setMarkers([...locMarkers, ...eventMarkers]);
      } catch (err) {
        console.error("Failed to load markers:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <ConsumerMobileLayout>
      <ConsumerAppHeader />

      <div className="rounded-xl overflow-hidden mx-2" style={{ height: "calc(100dvh - 180px)" }}>
        <ConsumerMapView
          center={center}
          markers={loading ? [] : markers}
          onMarkerClick={(id) => {
            const m = markers.find((mk) => mk.id === id);
            navigate(m?.type === "event" ? `/app/event/${id}` : `/app/restaurant/${id}`);
          }}
        />
      </div>

      <ConsumerBottomNav />
    </ConsumerMobileLayout>
  );
};

export default ConsumerHome;
