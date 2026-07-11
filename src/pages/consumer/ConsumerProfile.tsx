import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, ShoppingBag, MapPin, Users, Trophy } from "lucide-react";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";
import PushOptInButton from "@/components/consumer/PushOptInButton";

type Badge = { id: string; badge_key: string | null; badge_name: string | null; badge_icon: string | null };

const BADGE_CATALOG: { key: string; name: string; icon: string }[] = [
  { key: "account_created", name: "Welcome aboard", icon: "👋" },
  { key: "first_grand_opening", name: "First grand opening", icon: "🎉" },
  { key: "checkins_5", name: "Explorer", icon: "🗺️" },
  { key: "checkins_10", name: "City Regular", icon: "🏆" },
  { key: "first_referral", name: "First friend referred", icon: "🎁" },
  { key: "first_order", name: "First rescue order", icon: "🥡" },
];

const ConsumerProfile = () => {
  const navigate = useNavigate();
  const { consumer, user } = useConsumerAuth();
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!consumer?.id) return;
      const { data } = await supabase
        .from("consumer_badges")
        .select("id, badge_key, badge_name, badge_icon")
        .eq("consumer_id", consumer.id);
      if (!cancelled && data) setBadges(data as Badge[]);
    })();
    return () => { cancelled = true; };
  }, [consumer?.id]);

  const fallbackFirstName = consumer?.first_name || user?.user_metadata?.first_name || "";
  const fallbackLastName = consumer?.last_name || user?.user_metadata?.last_name || "";
  const fallbackEmail = consumer?.email || user?.email || "";
  const displayName = `${fallbackFirstName} ${fallbackLastName}`.trim() || "Guest";
  const initial = fallbackFirstName?.[0] || fallbackEmail?.[0]?.toUpperCase() || "G";
  const moneySaved = consumer?.money_saved?.toFixed?.(2) ?? "0.00";
  const poundsRescued = consumer?.pounds_rescued ?? 0;

  const earnedKeys = new Set(badges.map(b => b.badge_key).filter(Boolean));

  return (
    <ConsumerMobileLayout>
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft className="w-5 h-5 text-[#F97316]" /></button>
            <h1 className="text-xl font-bold text-[#1B2A4A]">Profile</h1>
          </div>
          <button onClick={() => navigate("/app/profile/edit")} aria-label="Edit profile"><Pencil className="w-5 h-5 text-[#F97316]" /></button>
        </div>
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-20 h-20 rounded-full bg-[#F97316] flex items-center justify-center text-white text-2xl font-bold">{initial}</div>
          <p className="text-lg font-bold text-[#1B2A4A]">{displayName}</p>
          {fallbackEmail && <p className="text-sm text-gray-500">{fallbackEmail}</p>}
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
        <button onClick={() => navigate("/app/invite-friends")} className="w-full flex items-center gap-3 py-4 border-b border-gray-100">
          <Users className="w-5 h-5 text-[#F97316]" /><span className="font-medium text-[#1B2A4A]">Invite friends</span>
        </button>
        <button onClick={() => navigate("/app/leaderboard")} className="w-full flex items-center gap-3 py-4 border-b border-gray-100">
          <Trophy className="w-5 h-5 text-[#F97316]" /><span className="font-medium text-[#1B2A4A]">Referral leaderboard</span>
        </button>
        <PushOptInButton />
        <h3 className="text-lg font-bold text-[#1B2A4A] mt-6 mb-3">My badges</h3>
        <div className="grid grid-cols-4 gap-3">
          {BADGE_CATALOG.map(b => {
            const earned = earnedKeys.has(b.key);
            return (
              <div key={b.key} title={b.name}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto ${earned ? "bg-[#F97316]/10" : "bg-gray-100 opacity-40 blur-[1px]"}`}>
                {earned ? b.icon : "🔒"}
              </div>
            );
          })}
        </div>
      </div>
      <ConsumerBottomNav />
    </ConsumerMobileLayout>
  );
};

export default ConsumerProfile;
