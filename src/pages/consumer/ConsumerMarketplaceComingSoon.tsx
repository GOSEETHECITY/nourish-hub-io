import { useNavigate } from "react-router-dom";
import { UtensilsCrossed, UserPlus } from "lucide-react";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerAppHeader from "@/components/consumer/ConsumerAppHeader";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";

const ConsumerMarketplaceComingSoon = () => {
  const navigate = useNavigate();
  return (
    <ConsumerMobileLayout>
      <ConsumerAppHeader />
      <div className="px-6 pt-16 pb-32 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-6">
          <UtensilsCrossed className="w-10 h-10 text-[#F97316]" />
        </div>
        <h1 className="text-2xl font-bold text-[#1B2A4A] mb-3">Marketplace Coming Soon</h1>
        <p className="text-gray-600 leading-relaxed max-w-xs mb-8">
          Your city is on its way to unlocking the marketplace — invite friends to speed it up!
        </p>
        <button
          onClick={() => navigate("/app/invite-friends")}
          className="w-full max-w-xs bg-[#F97316] text-white font-semibold py-3 rounded-full flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <UserPlus className="w-5 h-5" />
          Invite Friends
        </button>
      </div>
      <ConsumerBottomNav />
    </ConsumerMobileLayout>
  );
};

export default ConsumerMarketplaceComingSoon;
