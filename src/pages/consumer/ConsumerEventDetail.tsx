import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  MapPin,
  Calendar,
  Clock,
  Share2,
  CalendarPlus,
  Navigation,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import {
  formatTime,
  formatDateLong,
  buildMapLink,
  buildCalendarUrl,
} from "@/lib/formatters";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import { haversineMeters } from "@/lib/geo";

const CHECKIN_RADIUS_METERS = 805; // ~0.5 miles

const ConsumerEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useConsumerAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState<string | null>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setEvent(data);
        setLoading(false);
      });
  }, [id]);

  // Check if user already checked in today
  useEffect(() => {
    if (!id || !user) return;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("event_checkins")
      .select("id")
      .eq("event_id", id)
      .eq("user_id", user.id)
      .gte("checked_in_at", today + "T00:00:00")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAlreadyCheckedIn(true);
      });
  }, [id, user]);

  const handleCheckin = async () => {
    if (!user || !event) return;
    setCheckingIn(true);
    setCheckinMsg(null);

    if (!("geolocation" in navigator)) {
      setCheckinMsg("Location services are not available on this device.");
      setCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Use stored coordinates only — never geocode at read time.
        if (event.latitude == null || event.longitude == null) {
          setCheckinMsg("This event has no location set yet. Please try again later.");
          setCheckingIn(false);
          return;
        }

        const distance = haversineMeters(latitude, longitude, event.latitude, event.longitude);

        if (distance > CHECKIN_RADIUS_METERS) {
          const miles = (distance / 1609.34).toFixed(1);
          setCheckinMsg(
            `You're about ${miles} miles away. You need to be within 0.5 miles of the event to check in.`
          );
          setCheckingIn(false);
          return;
        }

        const { error } = await supabase.from("event_checkins").insert({
          event_id: event.id,
          user_id: user.id,
          latitude,
          longitude,
        });

        if (error) {
          if (error.code === "23505") {
            setCheckinMsg("You've already checked in to this event!");
          } else {
            setCheckinMsg("Check-in failed. Please try again.");
          }
        } else {
          setCheckinMsg("You're checked in! Enjoy the event.");
          setAlreadyCheckedIn(true);
          supabase.rpc("increment_attendee_count", { eid: event.id });
        }
        setCheckingIn(false);
      },
      () => {
        setCheckinMsg(
          "Please allow location access to check in."
        );
        setCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleShare = async () => {
    if (!event) return;
    const url = `${window.location.origin}/event-preview/${event.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} on GO See The City!`,
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    const url = buildCalendarUrl(event);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
    a.click();
  };

  if (loading)
    return (
      <ConsumerMobileLayout>
        <div className="p-8 text-center text-gray-500">Loading...</div>
      </ConsumerMobileLayout>
    );

  if (!event)
    return (
      <ConsumerMobileLayout>
        <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
          <p className="text-center text-[#1B2A4A] font-semibold">
            This event is no longer available
          </p>
          <button
            onClick={() => navigate("/app/events")}
            className="px-5 py-2.5 rounded-full bg-[#F97316] text-white font-semibold"
          >
            Back to Events
          </button>
        </div>
      </ConsumerMobileLayout>
    );

  const fullAddress = [event.address, event.city, event.state]
    .filter(Boolean)
    .join(", ");

  return (
    <ConsumerMobileLayout>
      {/* Hero image */}
      <div className="relative h-56 bg-gray-300">
        {event.image_url && (
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        )}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center">
          <Heart className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="px-4 pt-4 pb-8">
        {/* Title */}
        <h1 className="text-xl font-bold text-[#1B2A4A]">{event.title}</h1>

        {/* Business + category */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {event.business_name && (
            <span className="text-sm font-medium text-gray-700">{event.business_name}</span>
          )}
          {event.category && (
            <span className="text-xs bg-[#F97316]/10 text-[#F97316] font-semibold px-2 py-0.5 rounded-full">
              {event.category}
            </span>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-600 mt-3">{event.description}</p>
        )}

        {/* Info rows */}
        <div className="flex flex-col gap-3 mt-4 text-sm text-gray-500">
          {/* Address — clickable, opens maps */}
          {event.address && (
            <a
              href={buildMapLink(fullAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#F97316] underline underline-offset-2"
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{fullAddress}</span>
              <Navigation className="w-3 h-3 shrink-0" />
            </a>
          )}

          {/* Date — formatted */}
          {event.event_date && (
            <p className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              {formatDateLong(event.event_date)}
            </p>
          )}

          {/* Time — formatted */}
          {event.start_time && (
            <p className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              {formatTime(event.start_time)}
              {event.end_time && ` - ${formatTime(event.end_time)}`}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleAddToCalendar}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-[#1B2A4A]"
          >
            <CalendarPlus className="w-4 h-4" />
            Add to Calendar
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-[#1B2A4A]"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>

        {/* Check-in button */}
        <button
          onClick={handleCheckin}
          disabled={checkingIn || alreadyCheckedIn}
          className={`w-full mt-4 py-3 rounded-xl text-white font-bold text-base ${
            alreadyCheckedIn
              ? "bg-green-500"
              : "bg-[#F97316] active:bg-[#EA580C]"
          } disabled:opacity-70`}
        >
          {checkingIn
            ? "Checking in…"
            : alreadyCheckedIn
              ? "Checked In ✓"
              : "Check In"}
        </button>
        {checkinMsg && (
          <p className="text-xs text-center mt-2 text-gray-600">{checkinMsg}</p>
        )}
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerEventDetail;
