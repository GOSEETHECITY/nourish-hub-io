import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerPhoneEntry = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");

  const handleNext = () => {
    if (phone.length < 10) return;
    sessionStorage.setItem("signup_phone", phone);
    navigate("/app/verification");
  };

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Sign up</h1>
      </header>
      <div className="px-6 pt-8 flex flex-col gap-6">
        <p className="text-xl font-bold text-[#1B2A4A]">Enter your phone number</p>
        <div className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-3">
          <span className="text-lg">🇺🇸</span>
          <span className="text-gray-500">+1</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="(000) 000-0000"
            className="flex-1 outline-none text-lg"
            type="tel"
          />
        </div>
        <button
          onClick={handleNext}
          disabled={phone.length < 10}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors"
        >
          Next
        </button>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerPhoneEntry;
