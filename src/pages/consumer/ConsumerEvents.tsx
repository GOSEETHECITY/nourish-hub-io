import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { formatTime, formatDateShort } from "@/lib/formatters";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerAppHeader from "@/components/consumer/ConsumerAppHeader";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";

const ConsumerEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const { city, state } = useLocation();

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .eq("city", city)
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .then(({ data }) => setEvents(data || []));
  }, [city, state]);

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
        <h2 className="text-lg font-bold text-[#1B2A4A] my-3">Events</h2>
        <div className="flex flex-col gap-4">
          {events.map((ev) => (
            <button key={ev.id} onClick={() => navigate(`/app/event/${ev.id}`)} className="bg-white rounded-2xl shadow-md overflow-hidden text-left relative">
              <div className="relative w-full" style={{ minHeight: "10rem" }}>
                {ev.image_url ? (
                  <img src={ev.image_url} alt={ev.title} className="w-full object-contain bg-gray-100" style={{ maxHeight: "14rem" }} />
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
                <button
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center"
                  onClick={(e) => handleShare(e, ev)}
                >
                  <Share2 className="w-4 h-4 text-[#1B2A4A]" />
                </button>
              </div>
              <div className="p-3">
                <p className="font-semibold text-[#1B2A4A]">{ev.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ev.city}{ev.state ? `, ${ev.state}` : ""}</p>
                {ev.event_date && (
                  <p className="text-xs text-[#F97316] mt-1">
                    {formatDateShort(ev.event_date)}
                    {ev.start_time && ` · ${formatTime(ev.start_time)}`}
                  </p>
                )}
              </div>
            </button>
          ))}
          {events.length === 0 && <p className="text-center text-gray-400 py-8">No events yet</p>}
        </div>
      </div>
      <ConsumerBottomNav />
    </ConsumerMobileLayout>
  );
};

export default ConsumerEvents;
