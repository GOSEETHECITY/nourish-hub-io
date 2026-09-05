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
  const [marketingConsent, setMarketingConsent] = useState(false);

  const handleNext = async () => {
    setError("");
    if (phone.length < 10) return;

    setSending(true);
    const e164 = `+1${phone}`;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { channel: "sms" },
    });
    setSending(false);
    if (otpError) {
      setError(otpError.message || "Could not send code. Please try again.");
      return;
    }

    sessionStorage.setItem("signup_phone", phone);
    sessionStorage.setItem("signup_phone_e164", e164);
    sessionStorage.setItem("sms_marketing_consent", marketingConsent ? "true" : "false");
    sessionStorage.removeItem("phone_verified");
    navigate("/app/verification");
  };

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-6 h-6 text-[#1B2A4A]" />
        </button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Sign up</h1>
      </header>
      <div className="px-6 pt-4 flex flex-col gap-5">
        <div className="flex flex-col items-center">
          <img
            src="/go-see-the-city-logo.png"
            alt="GO See The City"
            className="h-28 w-auto object-contain"
          />
        </div>

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

        <p className="text-xs text-gray-500 -mt-2">
          By entering your phone number and selecting “Next,” you consent to receive a one-time SMS verification code from GO See The City to verify your account. Message and data rates may apply.
        </p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="mt-1 w-5 h-5 accent-[#F97316] shrink-0"
          />
          <span className="text-sm text-gray-700 leading-relaxed">
            I agree to receive recurring promotional text messages from GO See The City about grand opening events, restaurant deals, surplus food offers, and local happenings at the number provided above. Message frequency varies. Message and data rates may apply. Reply STOP to opt out.
          </span>
        </label>
        <p className="text-xs text-gray-400 -mt-3 ml-8">Optional — You can create an account without subscribing to promotional text messages.</p>

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
