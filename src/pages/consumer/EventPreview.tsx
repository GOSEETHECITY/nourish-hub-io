import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const EventPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from("events").select("*").eq("id", id).eq("status", "published").maybeSingle();
      setEvent(data);
      setLoading(false);
      // Increment share_count
      if (data) {
        await supabase.from("events").update({ share_count: (data.share_count || 0) + 1 }).eq("id", id);
      }
    };
    load();
  }, [id]);

  if (loading) return <ConsumerMobileLayout><div className="p-8 text-center text-gray-500">Loading...</div></ConsumerMobileLayout>;
  if (!event) return <ConsumerMobileLayout><div className="p-8 text-center text-gray-500">Event not found</div></ConsumerMobileLayout>;

  return (
    <ConsumerMobileLayout>
      <div className="min-h-screen bg-white">
        {/* Event image / flyer */}
        <div className="w-full">
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} className="w-full object-contain bg-gray-100" style={{ maxHeight: "20rem" }} />
          ) : (
            <div className="w-full h-56 bg-gradient-to-br from-[#F97316] to-[#8DC63F] flex items-center justify-center p-6">
              <div className="text-center text-white">
                <p className="text-sm font-bold mb-2">GO See The City</p>
                <p className="text-2xl font-bold">{event.title}</p>
                {event.offer_badge && (
                  <span className="inline-block mt-2 bg-white/20 text-white text-sm font-bold px-4 py-1 rounded-full">{event.offer_badge}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Event info */}
        <div className="px-5 pt-4">
          <h1 className="text-xl font-bold text-[#1B2A4A]">{event.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{[event.city, event.state].filter(Boolean).join(", ")}</p>
          {event.event_date && (
            <p className="text-sm text-[#F97316] mt-1">
              {new Date(event.event_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>

        {/* Blurred / gated section */}
        <div className="px-5 mt-4 relative">
          <div className="blur-sm select-none pointer-events-none">
            <p className="text-sm text-gray-600 leading-relaxed">
              {event.description || "Join us for this exciting event! Full details including exclusive offers, directions, and more are available after signing up. Don't miss out on special deals and promotions in your city."}
            </p>
            <div className="mt-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>

          {/* CTA overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mx-4 text-center max-w-sm w-full border border-gray-100">
              <p className="text-lg font-bold text-[#1B2A4A] mb-2">Sign up free to see full event details and find deals near you</p>
              <button
                onClick={() => {
                  sessionStorage.setItem("redirect_after_signup", `/app/event/${id}`);
                  navigate("/app/signup");
                }}
                className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] transition-colors mt-3"
              >
                Sign Up
              </button>
              <button
                onClick={() => {
                  sessionStorage.setItem("redirect_after_login", `/app/event/${id}`);
                  navigate("/app/login");
                }}
                className="mt-3 text-sm text-[#F97316] font-semibold"
              >
                Already have an account? Log in
              </button>
            </div>
          </div>
        </div>
      </div>
    </ConsumerMobileLayout>
  );
};

export default EventPreview;
