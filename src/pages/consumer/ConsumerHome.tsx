import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerAppHeader from "@/components/consumer/ConsumerAppHeader";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [mapReady, setMapReady] = useState(false);
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  // Lazy-load leaflet to avoid SSR/bundler crashes
  useEffect(() => {
    const loadMap = async () => {
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        const RL = await import("react-leaflet");

        // Fix default icon
        const iconUrl = (await import("leaflet/dist/images/marker-icon.png")).default;
        const iconRetinaUrl = (await import("leaflet/dist/images/marker-icon-2x.png")).default;
        const shadowUrl = (await import("leaflet/dist/images/marker-shadow.png")).default;

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

        const orangeIcon = new L.Icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
        });

        setMapComponents({ ...RL, orangeIcon, L });
        setMapReady(true);
      } catch (err) {
        console.error("Failed to load map:", err);
        setMapReady(true); // Still show the page
      }
    };
    loadMap();
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
          .map((l) => ({ id: l.id, name: l.name, lat: l.latitude!, lng: l.longitude!, type: "restaurant" as const }));
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

      {(!mapReady || loading) ? (
        <div className="h-screen w-full flex flex-col items-center justify-center gap-4 pt-16">
          <Skeleton className="w-3/4 h-4" />
          <Skeleton className="w-1/2 h-4" />
          <Skeleton className="w-full h-[60vh] rounded-xl mx-4" />
          <p className="text-sm text-gray-400">Loading map...</p>
        </div>
      ) : MapComponents ? (
        <MapComponents.MapContainer center={center} zoom={13} style={{ height: "100vh", width: "100%" }} zoomControl={false}>
          <MapComponents.TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
          {markers.map((m) => (
            <MapComponents.Marker key={m.id} position={[m.lat, m.lng]} icon={MapComponents.orangeIcon}>
              <MapComponents.Popup>
                <div className="text-center">
                  <p className="font-semibold">{m.name}</p>
                  <button onClick={() => navigate(`/app/restaurant/${m.id}`)}
                    className="mt-1 px-3 py-1 bg-[#F97316] text-white rounded-full text-xs font-semibold">View</button>
                </div>
              </MapComponents.Popup>
            </MapComponents.Marker>
          ))}
        </MapComponents.MapContainer>
      ) : (
        <div className="h-screen w-full flex items-center justify-center pt-16">
          <p className="text-gray-400 text-sm">Map could not be loaded.</p>
        </div>
      )}

      <ConsumerBottomNav />
    </ConsumerMobileLayout>
  );
};

export default ConsumerHome;
