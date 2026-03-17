import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerDecorativeBackground from "@/components/consumer/ConsumerDecorativeBackground";

const ConsumerLoading = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/app/splash"), 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <ConsumerMobileLayout className="flex items-center justify-center overflow-hidden">
      <ConsumerDecorativeBackground />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="text-4xl font-extrabold tracking-tight">
          <span className="text-[#F97316]">GO</span>{" "}
          <span className="text-[#1B2A4A]">See The City</span>
        </div>
        <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin" />
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerLoading;
