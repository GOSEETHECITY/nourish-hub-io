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

const ConsumerHome = () => {
  const navigate = useNavigate();
  const [center, setCenter] = useState<[number, number]>([28.5383, -81.3792]);
  const [markers, setMarkers] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
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
        setMarkers(locMarkers);
      } catch (err) {
        console.error("Failed to load markers:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <ConsumerMobileLayout className="relative">
      <div className="absolute top-0 left-0 right-0 z-30">
        <ConsumerAppHeader />
      </div>

      <ConsumerMapView
        center={center}
        markers={loading ? [] : markers}
        onMarkerClick={(id) => navigate(`/app/restaurant/${id}`)}
      />

      <ConsumerBottomNav />
    </ConsumerMobileLayout>
  );
};

export default ConsumerHome;
