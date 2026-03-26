import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon issue with Vite bundler
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerAppHeader from "@/components/consumer/ConsumerAppHeader";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";

const orangeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface MapLocation { id: string; name: string; lat: number; lng: number; type: "restaurant" | "event"; }

const ConsumerHome = () => {
  const navigate = useNavigate();
  const [center, setCenter] = useState<[number, number]>([28.5383, -81.3792]);
  const [markers, setMarkers] = useState<MapLocation[]>([]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: locs } = await supabase
        .from("locations")
        .select("id, name, latitude, longitude")
        .eq("approval_status", "approved")
        .eq("marketplace_enabled", true);
      const locMarkers: MapLocation[] = (locs || [])
        .filter((l) => l.latitude && l.longitude)
        .map((l) => ({ id: l.id, name: l.name, lat: l.latitude!, lng: l.longitude!, type: "restaurant" }));

      const { data: evts } = await supabase.from("events").select("id, title, address").eq("status", "published");
      // Events don't have lat/lng in DB so we skip map markers for them for now
      setMarkers(locMarkers);
    };
    load();
  }, []);

  return (
    <ConsumerMobileLayout className="relative">
      <div className="absolute top-0 left-0 right-0 z-30">
        <ConsumerAppHeader />
      </div>
      <MapContainer center={center} zoom={13} style={{ height: "100vh", width: "100%" }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={m.type === "restaurant" ? orangeIcon : greenIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-semibold">{m.name}</p>
                <button onClick={() => navigate(`/app/restaurant/${m.id}`)}
                  className="mt-1 px-3 py-1 bg-[#F97316] text-white rounded-full text-xs font-semibold">View</button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <ConsumerBottomNav />
    </ConsumerMobileLayout>
  );
};

export default ConsumerHome;
