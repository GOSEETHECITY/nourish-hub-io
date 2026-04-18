import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, ShoppingBag, MapPin } from "lucide-react";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";

const LOCKED_BADGES = Array.from({ length: 8 }, (_, index) => ({
  id: `locked-${index + 1}`,
  icon: "🔒",
}));

const ConsumerProfile = () => {
  const navigate = useNavigate();
  const { consumer } = useConsumerAuth();
  const [badges, setBadges] = useState<Array<{ id: string; badge_icon: string | null }>>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (consumer?.id) {
          const { data } = await supabase
            .from("consumer_badges")
            .select("id, badge_icon")
            .eq("consumer_id", consumer.id);
          if (!cancelled && data) setBadges(data);
        }
      } catch {
        if (!cancelled) setBadges([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [consumer?.id]);

  const displayName = consumer ? `${consumer.first_name ?? ""} ${consumer.last_name ?? ""}`.trim() || "Guest" : "Guest";
  const initial = consumer?.first_name?.[0] || "G";
  const moneySaved = consumer?.money_saved?.toFixed?.(2) ?? "0.00";
  const poundsRescued = consumer?.pounds_rescued ?? 0;
  const badgeItems = badges.length > 0
    ? badges.map((badge) => ({ id: badge.id, icon: badge.badge_icon || "🏅" }))
    : LOCKED_BADGES;

  return (
    <ConsumerMobileLayout>
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#1B2A4A]">Profile</h1>
          <button onClick={() => navigate("/app/profile/edit")} aria-label="Edit profile">
            <Pencil className="w-5 h-5 text-[#F97316]" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-20 h-20 rounded-full bg-[#F97316] flex items-center justify-center text-white text-2xl font-bold">
            {initial}
          </div>
          <p className="text-lg font-bold text-[#1B2A4A]">{displayName}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#8DC63F]/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#8DC63F]">${moneySaved}</p>
            <p className="text-xs text-gray-500 mt-1">Money Saved</p>
          </div>
          <div className="bg-[#F97316]/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#F97316]">{poundsRescued} lbs</p>
            <p className="text-xs text-gray-500 mt-1">Food Rescued</p>
          </div>
        </div>
        <button onClick={() => navigate("/app/orders")} className="w-full flex items-center gap-3 py-4 border-b border-gray-100">
          <ShoppingBag className="w-5 h-5 text-[#F97316]" /><span className="font-medium text-[#1B2A4A]">Orders</span>
        </button>
        <button onClick={() => navigate("/app/checkins")} className="w-full flex items-center gap-3 py-4 border-b border-gray-100">
          <MapPin className="w-5 h-5 text-[#F97316]" /><span className="font-medium text-[#1B2A4A]">Check-ins</span>
        </button>
        <h3 className="text-lg font-bold text-[#1B2A4A] mt-6 mb-3">My badges</h3>
        <div className="grid grid-cols-4 gap-3 min-h-[4rem]">
          {badgeItems.map((badge) => (
            <div key={badge.id} className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl mx-auto">
              {badge.icon}
            </div>
          ))}
        </div>
      </div>
      <ConsumerBottomNav />
    </ConsumerMobileLayout>
  );
};

export default ConsumerProfile;
