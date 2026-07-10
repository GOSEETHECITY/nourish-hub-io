import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerAppHeader from "@/components/consumer/ConsumerAppHeader";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";
import ConsumerMapView from "@/components/consumer/ConsumerMapView";

interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "restaurant" | "event" | "flash";
  subtitle?: string;
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

// Pre-built city center coordinates so we don't need to geocode the selected city on every render
const CITY_CENTERS: Record<string, [number, number]> = {
  "Atlanta, GA": [33.749, -84.388],
  "Orlando, FL": [28.5383, -81.3792],
  "Miami, FL": [25.7617, -80.1918],
  "Jacksonville, FL": [30.3322, -81.6557],
  "St. Petersburg, FL": [27.7676, -82.6403],
  "Hernando, FL": [28.8946, -82.3760],
  "Dunedin, FL": [28.0197, -82.7723],
  "Rogers, AR": [36.3320, -94.1185],
  "Lowell, AR": [36.2562, -94.1316],
  "Ashland, OH": [40.8689, -82.3187],
  "Hampton, GA": [33.3879, -84.2828],
  "Seattle, WA": [47.6062, -122.3321],
  "St. Louis, MO": [38.6270, -90.1994],
  "Minneapolis, MN": [44.9778, -93.2650],
  "Albuquerque, NM": [35.0844, -106.6504],
};

const ConsumerHome = () => {
  const navigate = useNavigate();
  const { city, state, ready } = useLocation();
  const cityKey = `${city}, ${state}`;
  const [center, setCenter] = useState<[number, number] | null>(() => {
    if (ready && CITY_CENTERS[cityKey]) return CITY_CENTERS[cityKey];
    return null;
  });
  const [markers, setMarkers] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Update map center whenever the user changes their selected city.
  // Never fall back to Atlanta — wait for LocationContext to become ready.
  useEffect(() => {
    if (!ready) return;
    const known = CITY_CENTERS[cityKey];
    if (known) {
      setCenter(known);
      return;
    }
    geocode(`${city}, ${state}, USA`).then((coords) => {
      if (coords) setCenter([coords.lat, coords.lng]);
    });
  }, [city, state, cityKey, ready]);

  useEffect(() => {
    const load = async () => {
      try {
        // Restaurant locations in selected city
        const { data: locsRaw } = await (supabase as any)
          .from("locations_public")
          .select("id, name, latitude, longitude, city, state")
          .eq("marketplace_enabled", true)
          .eq("city", city)
          .eq("state", state);
        const locs = (locsRaw || []) as Array<{ id: string; name: string; latitude: number | null; longitude: number | null }>;
        const locMarkers: MapLocation[] = locs
          .filter((l) => l.latitude && l.longitude)
          .map((l) => ({
            id: l.id,
            name: l.name,
            lat: l.latitude!,
            lng: l.longitude!,
            type: "restaurant" as const,
          }));

        // Events: use stored coordinates only — no client-side geocoding.
        const today = new Date().toISOString().split("T")[0];
        const { data: events } = await supabase
          .from("events")
          .select("id, title, latitude, longitude")
          .eq("status", "published")
          .gte("event_date", today)
          .eq("city", city)
          .eq("state", state);

        const eventMarkers: MapLocation[] = (events || [])
          .filter((ev: any) => ev.latitude != null && ev.longitude != null)
          .map((ev: any) => ({
            id: ev.id,
            name: ev.title,
            lat: ev.latitude,
            lng: ev.longitude,
            type: "event" as const,
          }));

        // Flash rescue listings: active window, in this city (via location).
        // Resolve city membership by joining through locations_public.
        const cityLocIds = locs.map((l) => l.id);
        let flashMarkers: MapLocation[] = [];
        if (cityLocIds.length > 0) {
          const { data: flash } = await supabase
            .from("food_listings")
            .select("id, food_type, latitude, longitude, pickup_window_end, flash_price_cents, is_free_to_public, location_id")
            .eq("is_flash", true)
            .in("location_id", cityLocIds)
            .gt("pickup_window_end", new Date().toISOString());
          flashMarkers = (flash || [])
            .filter((f: any) => f.latitude != null && f.longitude != null)
            .map((f: any) => {
              const price = Number(f.flash_price_cents ?? 0);
              const isFree = f.is_free_to_public || price === 0;
              return {
                id: f.id,
                name: (f.food_type || "Surplus food").replace(/_/g, " "),
                lat: Number(f.latitude),
                lng: Number(f.longitude),
                type: "flash" as const,
                subtitle: isFree ? "Flash rescue · FREE" : `Flash rescue · $${(price / 100).toFixed(2)}`,
              };
            });
        }

        setMarkers([...locMarkers, ...eventMarkers, ...flashMarkers]);
      } catch (err) {
        console.error("Failed to load markers:", err);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    load();
  }, [city, state]);

  // Realtime: refresh when flash listings change so pins appear/disappear live.
  useEffect(() => {
    const channel = supabase
      .channel("consumer-home-flash")
      .on("postgres_changes", { event: "*", schema: "public", table: "food_listings", filter: "is_flash=eq.true" }, () => {
        // Trigger reload by bumping state key: simplest is re-run the effect above.
        // We just refetch by toggling loading, then relying on the effect deps —
        // but deps are [city,state]. Instead, dispatch a manual refetch:
        (async () => {
          setLoading(true);
          // Re-run by no-op state update; simpler: replicate the load inline is overkill.
          // We rely on the parent effect being reactive to `city,state`. To force a refresh
          // without duplicating logic, we clear markers and refetch via a lightweight call.
          const { data: locsRaw } = await (supabase as any)
            .from("locations_public")
            .select("id")
            .eq("city", city).eq("state", state);
          const ids = (locsRaw || []).map((l: any) => l.id);
          if (!ids.length) { setLoading(false); return; }
          const { data: flash } = await supabase
            .from("food_listings")
            .select("id, food_type, latitude, longitude, pickup_window_end, flash_price_cents, is_free_to_public")
            .eq("is_flash", true)
            .in("location_id", ids)
            .gt("pickup_window_end", new Date().toISOString());
          setMarkers((prev) => {
            const nonFlash = prev.filter((m) => m.type !== "flash");
            const flashMarkers: MapLocation[] = (flash || [])
              .filter((f: any) => f.latitude != null && f.longitude != null)
              .map((f: any) => {
                const price = Number(f.flash_price_cents ?? 0);
                const isFree = f.is_free_to_public || price === 0;
                return {
                  id: f.id,
                  name: (f.food_type || "Surplus food").replace(/_/g, " "),
                  lat: Number(f.latitude),
                  lng: Number(f.longitude),
                  type: "flash" as const,
                  subtitle: isFree ? "Flash rescue · FREE" : `Flash rescue · $${(price / 100).toFixed(2)}`,
                };
              });
            return [...nonFlash, ...flashMarkers];
          });
          setLoading(false);
        })();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [city, state]);

  return (
    <ConsumerMobileLayout>
      <div className="flex flex-col overflow-hidden" style={{ height: "calc(100dvh - 130px)", maxHeight: "calc(100dvh - 130px)" }}>
        <ConsumerAppHeader />
        <div className="flex-1 overflow-hidden">
          {center ? (
            <ConsumerMapView
              center={center}
              markers={loading ? [] : markers}
              onMarkerClick={(id) => {
                const m = markers.find((mk) => mk.id === id);
                navigate(m?.type === "event" ? `/app/event/${id}` : `/app/restaurant/${id}`);
              }}
            />
          ) : (
            <div className="h-full w-full bg-gray-50" aria-hidden />
          )}
        </div>
        <ConsumerBottomNav />
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerHome;
