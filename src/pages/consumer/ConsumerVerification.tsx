import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerVerification = () => {
  const navigate = useNavigate();
  const phone = sessionStorage.getItem("signup_phone") || "";
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(59);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const handleChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    if (val && idx < 3) inputRefs.current[idx + 1]?.focus();
  };

  const handleConfirm = () => {
    if (digits.every((d) => d.length === 1)) navigate("/app/signup");
  };

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Sign up</h1>
      </header>
      <div className="px-6 pt-8 flex flex-col items-center gap-6">
        <p className="text-xl font-bold text-[#1B2A4A]">Verification code</p>
        <p className="text-sm text-gray-500">We have sent the code to +1 {phone}</p>
        <div className="flex gap-4">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              maxLength={1}
              className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-[#F97316] focus:outline-none"
            />
          ))}
        </div>
        <button
          onClick={handleConfirm}
          disabled={!digits.every((d) => d.length === 1)}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors"
        >
          Confirm
        </button>
        <p className="text-sm text-gray-500">
          {timer > 0 ? `Resend in 0:${timer.toString().padStart(2, "0")}` : (
            <button onClick={() => setTimer(59)} className="text-[#F97316] font-semibold">Resend</button>
          )}
        </p>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerVerification;
