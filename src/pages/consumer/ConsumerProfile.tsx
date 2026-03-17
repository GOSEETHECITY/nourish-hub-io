import { useNavigate } from "react-router-dom";
import { Pencil, ShoppingBag, MapPin, Award } from "lucide-react";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerBottomNav from "@/components/consumer/ConsumerBottomNav";

const ConsumerProfile = () => {
  const navigate = useNavigate();
  const { consumer } = useConsumerAuth();

  return (
    <ConsumerMobileLayout>
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[#1B2A4A]">Profile</h1>
          <button onClick={() => navigate("/app/profile/edit")}><Pencil className="w-5 h-5 text-[#F97316]" /></button>
        </div>
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-20 h-20 rounded-full bg-[#F97316] flex items-center justify-center text-white text-2xl font-bold">
            {consumer?.first_name?.[0] || "G"}
          </div>
          <p className="text-lg font-bold text-[#1B2A4A]">{consumer ? `${consumer.first_name} ${consumer.last_name}` : "Guest"}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#8DC63F]/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#8DC63F]">${consumer?.money_saved?.toFixed(2) || "0.00"}</p>
            <p className="text-xs text-gray-500 mt-1">Money Saved</p>
          </div>
          <div className="bg-[#F97316]/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#F97316]">{consumer?.pounds_rescued || 0} lbs</p>
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
        <div className="grid grid-cols-4 gap-3">
          {["🌱","🍔","⭐","🎉"].map((b, i) => (
            <div key={i} className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl mx-auto">{b}</div>
          ))}
        </div>
      </div>
      <ConsumerBottomNav />
    </ConsumerMobileLayout>
  );
};

export default ConsumerProfile;
