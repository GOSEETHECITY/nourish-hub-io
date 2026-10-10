import { useEffect, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import { formatDateShort } from "@/lib/formatters";

type CheckIn = { id: string; checked_in_at: string | null; events: { id: string; title: string; event_date: string | null } | null };

const MILESTONES = [
  { count: 5, name: "Explorer" },
  { count: 10, name: "City Regular" },
];

const ConsumerCheckIns = () => {
  const navigate = useNavigate();
  const { user } = useConsumerAuth();
  const [items, setItems] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("event_checkins")
      .select("id, checked_in_at, events(id, title, event_date)")
      .eq("user_id", user.id)
      .order("checked_in_at", { ascending: false })
      .then(({ data }) => { setItems((data as any) || []); setLoading(false); });
  }, [user]);

  const total = items.length;
  const next = MILESTONES.find((m) => total < m.count);

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Check-ins</h1>
      </header>
      <div className="px-4 pb-8">
        <div className="bg-[#F97316]/10 rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-[#1B2A4A]">{total} check-in{total === 1 ? "" : "s"}</p>
          {next ? (
            <>
              <p className="text-xs text-gray-600 mt-1">
                {next.count - total} more check-in{next.count - total === 1 ? "" : "s"} to {next.name}
              </p>
              <div className="h-2 bg-white rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#F97316]" style={{ width: `${Math.min(100, (total / next.count) * 100)}%` }} />
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-600 mt-1">You've earned every check-in badge!</p>
          )}
        </div>
        {loading ? (
          <p className="text-center text-gray-400 py-8">Loading…</p>
        ) : total === 0 ? (
          <p className="text-center text-gray-400 py-8">No check-ins yet</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => c.events?.id && navigate(`/app/event/${c.events.id}`)}
                  className="w-full flex items-center gap-3 py-3 text-left"
                >
                  <MapPin className="w-5 h-5 text-[#F97316] shrink-0" />
                  <div>
                    <p className="font-medium text-[#1B2A4A]">{c.events?.title || "Event"}</p>
                    <p className="text-xs text-gray-500">
                      {c.checked_in_at ? new Date(c.checked_in_at).toLocaleDateString() : c.events?.event_date ? formatDateShort(c.events.event_date) : ""}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerCheckIns;
