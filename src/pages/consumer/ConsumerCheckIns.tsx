import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const tabs = ["Restaurants", "Events"];

const ConsumerCheckIns = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Check-ins</h1>
      </header>
      <div className="flex border-b border-gray-200 px-4">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setActive(i)}
            className={`flex-1 py-3 text-sm font-semibold ${active === i ? "text-[#F97316] border-b-2 border-[#F97316]" : "text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="px-4 py-6">
        <p className="text-center text-gray-400 py-8">No check-ins yet</p>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerCheckIns;
