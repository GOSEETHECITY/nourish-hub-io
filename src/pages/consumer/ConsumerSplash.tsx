import { useNavigate } from "react-router-dom";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerDecorativeBackground from "@/components/consumer/ConsumerDecorativeBackground";

const ConsumerSplash = () => {
  const navigate = useNavigate();

  return (
    <ConsumerMobileLayout className="flex flex-col items-center justify-center overflow-hidden">
      <ConsumerDecorativeBackground />
      <div className="relative z-10 flex flex-col items-center gap-6 px-8">
        <div className="text-4xl font-extrabold tracking-tight text-center">
          <span className="text-[#F97316]">GO</span>{" "}
          <span className="text-[#1B2A4A]">See The City</span>
        </div>
        <p className="text-2xl font-bold text-[#1B2A4A] text-center">Be in the know</p>
        <p className="text-lg text-[#8DC63F] font-semibold text-center">Discounts and Events!</p>
        <button
          onClick={() => navigate("/app/invite-code")}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] transition-colors mt-4"
        >
          Join with us
        </button>
        <button onClick={() => navigate("/app/login")} className="text-[#1B2A4A] underline text-sm">
          Login
        </button>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerSplash;
