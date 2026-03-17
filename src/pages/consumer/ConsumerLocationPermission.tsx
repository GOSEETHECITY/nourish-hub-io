import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerLocationPermission = () => {
  const navigate = useNavigate();

  const handleAllow = () => {
    navigator.geolocation.getCurrentPosition(
      () => navigate("/app/home"),
      () => navigate("/app/home")
    );
  };

  return (
    <ConsumerMobileLayout className="flex flex-col items-center justify-center gap-6 px-8">
      <div className="w-24 h-24 rounded-full bg-[#F97316]/10 flex items-center justify-center">
        <MapPin className="w-12 h-12 text-[#F97316]" />
      </div>
      <h1 className="text-xl font-bold text-[#1B2A4A] text-center">Location services is disabled</h1>
      <p className="text-sm text-gray-500 text-center">Please enable location services so we can show you nearby deals and events.</p>
      <button onClick={handleAllow}
        className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] transition-colors">
        Allow location
      </button>
    </ConsumerMobileLayout>
  );
};

export default ConsumerLocationPermission;
