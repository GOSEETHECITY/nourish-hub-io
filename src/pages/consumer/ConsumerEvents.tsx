import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, MapPin, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { formatTime, formatDateShort } from "@/lib/formatters";
import { haversineMiles, formatDistance } from "@/lib/geo";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerAppHeader from "@/components/consumer/ConsumerAppHeader";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";

const ConsumerEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { city, state, ready } = useLocation();

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    setError(false);
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .eq("city", city)
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) {
          setError(true);
          setEvents([]);
        } else {
          setEvents(data || []);
        }
        setLoading(false);
      });
  }, [city, state, ready, reloadKey]);

  const handleShare = async (e: React.MouseEvent, ev: any) => {
    e.stopPropagation();
    const url = `${window.location.origin}/event-preview/${ev.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: ev.title, text: `Check out ${ev.title} on GO See The City!`, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <ConsumerMobileLayout>
      <ConsumerAppHeader />
      <div className="px-4 pb-24">
        <h2 className="text-lg font-bold text-[#1B2A4A] my-3">Events in {city}</h2>
        <div className="flex flex-col gap-4">
          {loading && (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
                  <div className="w-full h-40 bg-gray-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </>
          )}
          {!loading && error && (
            <div className="text-center py-12">
              <p className="text-gray-700 font-medium">Check your connection</p>
              <p className="text-gray-400 text-sm mt-1">We couldn't load events right now.</p>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="mt-4 px-5 py-2 rounded-full bg-[#F97316] text-white font-semibold text-sm"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !error && events.map((ev) => {
            const image = ev.image_url || ev.flyer_url;
            const distance =
              userCoords && ev.latitude != null && ev.longitude != null
                ? haversineMiles(userCoords.lat, userCoords.lng, ev.latitude, ev.longitude)
                : null;
            return (
              <button
                key={ev.id}
                onClick={() => navigate(`/app/event/${ev.id}`)}
                className="bg-white rounded-2xl shadow-md overflow-hidden text-left relative"
              >
                <div className="relative w-full" style={{ minHeight: "10rem" }}>
                  {image ? (
                    <img
                      src={image}
                      alt={ev.title}
                      className="w-full object-contain bg-gray-100"
                      style={{ maxHeight: "14rem" }}
                    />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-[#F97316] to-[#8DC63F] flex items-center justify-center p-4">
                      <div className="text-center text-white">
                        <p className="text-xs font-bold mb-1">GO See The City</p>
                        <p className="text-lg font-bold">{ev.title}</p>
                      </div>
                    </div>
                  )}
                  {ev.offer_badge && (
                    <span className="absolute bottom-2 left-2 bg-[#F97316] text-white text-xs font-bold px-3 py-1 rounded-full">
                      {ev.offer_badge}
                    </span>
                  )}
                  {ev.category && (
                    <span className="absolute top-2 left-2 bg-white/90 text-[#1B2A4A] text-xs font-semibold px-2 py-1 rounded-full">
                      {ev.category}
                    </span>
                  )}
                  <button
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center"
                    onClick={(e) => handleShare(e, ev)}
                  >
                    <Share2 className="w-4 h-4 text-[#1B2A4A]" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-[#1B2A4A]">{ev.title}</p>
                  {ev.business_name && (
                    <p className="text-xs text-gray-700 mt-0.5">{ev.business_name}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {ev.city}{ev.state ? `, ${ev.state}` : ""}
                    </span>
                    {distance != null && (
                      <span>{formatDistance(distance)}</span>
                    )}
                  </div>
                  {ev.event_date && (
                    <p className="text-xs text-[#F97316] mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateShort(ev.event_date)}
                      {ev.start_time && ` · ${formatTime(ev.start_time)}`}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
          {!loading && !error && events.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 font-medium">No events in {city} yet</p>
              <p className="text-gray-400 text-sm mt-1">Check back soon for grand openings and pop-ups near you.</p>
            </div>
          )}
        </div>
      </div>
      <ConsumerBottomNav />
    </ConsumerMobileLayout>
  );
};

export default ConsumerEvents;
