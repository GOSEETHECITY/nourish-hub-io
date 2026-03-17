import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerAddPayment = () => {
  const navigate = useNavigate();
  const [card, setCard] = useState({ number: "", expiry: "", ccv: "" });

  const formatCardNumber = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Add Payment</h1>
      </header>
      <div className="px-6 pb-8">
        <div className="bg-gradient-to-br from-purple-600 to-purple-900 rounded-2xl p-6 text-white mb-6">
          <p className="text-xs opacity-70 mb-8">Credit Card</p>
          <p className="text-lg tracking-widest font-mono mb-4">{card.number || "•••• •••• •••• ••••"}</p>
          <div className="flex justify-between text-sm">
            <span>{card.expiry || "MM/YY"}</span>
            <span>{card.ccv ? "•".repeat(card.ccv.length) : "CCV"}</span>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Card Number</label>
            <input value={card.number} onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
              placeholder="1234 5678 9012 3456"
              className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Expiry</label>
              <input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                placeholder="MM/YY"
                className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">CCV</label>
              <input value={card.ccv} onChange={(e) => setCard({ ...card, ccv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                placeholder="123" type="password"
                className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]" />
            </div>
          </div>
          <button onClick={() => navigate(-1)}
            className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] transition-colors mt-2">
            Add
          </button>
        </div>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerAddPayment;
