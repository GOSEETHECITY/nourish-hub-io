import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import { supabase } from "@/integrations/supabase/client";

const ConsumerPhoneEntry = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const handleNext = async () => {
    setError("");
    if (phone.length < 10) return;
    // Invite-code session value is required before phone verification can start.
    if (!sessionStorage.getItem("invite_code")) {
      navigate("/app/invite", { replace: true });
      return;
    }
    setSending(true);
    const e164 = `+1${phone}`;
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { channel: "sms" },
    });
    setSending(false);
    if (error) {
      setError(error.message || "Could not send code. Please try again.");
      return;
    }
    sessionStorage.setItem("signup_phone", phone);
    sessionStorage.setItem("signup_phone_e164", e164);
    sessionStorage.removeItem("phone_verified");
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
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          onClick={handleNext}
          disabled={phone.length < 10 || sending}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors"
        >
          {sending ? "Sending code…" : "Next"}
        </button>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerPhoneEntry;
