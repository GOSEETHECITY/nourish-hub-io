import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, MapPin, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    if (id) supabase.from("events").select("*").eq("id", id).maybeSingle().then(({ data }) => setEvent(data));
  }, [id]);

  if (!event) return <ConsumerMobileLayout><div className="p-8 text-center">Loading...</div></ConsumerMobileLayout>;

  return (
    <ConsumerMobileLayout>
      <div className="relative h-56 bg-gray-300">
        {event.image_url && <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />}
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center">
          <Heart className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <div className="px-4 pt-4 pb-8">
        <h1 className="text-xl font-bold text-[#1B2A4A]">{event.title}</h1>
        {event.description && <p className="text-sm text-gray-600 mt-2">{event.description}</p>}
        <div className="flex flex-col gap-2 mt-4 text-sm text-gray-500">
          {event.address && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" />{event.address}, {event.city}</p>}
          {event.event_date && <p className="flex items-center gap-2"><Calendar className="w-4 h-4" />{event.event_date}</p>}
          {event.start_time && <p className="flex items-center gap-2"><Clock className="w-4 h-4" />{event.start_time}{event.end_time ? ` - ${event.end_time}` : ""}</p>}
        </div>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerEventDetail;
