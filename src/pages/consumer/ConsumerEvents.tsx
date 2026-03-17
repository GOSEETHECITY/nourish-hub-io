import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerAppHeader from "@/components/consumer/ConsumerAppHeader";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";

const ConsumerEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("events").select("*").eq("status", "published").then(({ data }) => setEvents(data || []));
  }, []);

  return (
    <ConsumerMobileLayout>
      <ConsumerAppHeader />
      <div className="px-4 pb-24">
        <h2 className="text-lg font-bold text-[#1B2A4A] my-3">Events</h2>
        <div className="flex flex-col gap-4">
          {events.map((e) => (
            <button key={e.id} onClick={() => navigate(`/app/event/${e.id}`)} className="bg-white rounded-2xl shadow-md overflow-hidden text-left">
              <div className="relative h-36 bg-gray-200">
                {e.image_url && <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />}
                <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center" onClick={(ev) => ev.stopPropagation()}>
                  <Heart className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="p-3">
                <p className="font-semibold text-[#1B2A4A]">{e.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{e.city}{e.state ? `, ${e.state}` : ""}</p>
                {e.event_date && <p className="text-xs text-[#F97316] mt-1">{e.event_date}</p>}
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
