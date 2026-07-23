import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import { supabase } from "@/integrations/supabase/client";

const ConsumerVerification = () => {
  const navigate = useNavigate();
  const phone = sessionStorage.getItem("signup_phone") || "";
  const phoneE164 = sessionStorage.getItem("signup_phone_e164") || "";
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(59);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Guard against direct navigation: must have started the OTP flow.
  useEffect(() => {
    if (!phoneE164 || !sessionStorage.getItem("invite_code")) {
      navigate("/app/phone", { replace: true });
    }
  }, [phoneE164, navigate]);

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
    if (val && idx < digits.length - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleConfirm = async () => {
    setError("");
    const code = digits.join("");
    if (code.length !== digits.length) return;
    setVerifying(true);

    // TEMPORARY: coordinator SMS bypass while Twilio toll-free is pending
    // carrier approval. The edge function decides server-side whether the
    // submitted code is the bypass code; if so it mints a real session.
    try {
      const { data: bypassData } = await supabase.functions.invoke(
        "verify-coordinator-otp",
        { body: { phone: phoneE164, code } },
      );
      if (bypassData?.bypass && bypassData.access_token && bypassData.refresh_token) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: bypassData.access_token,
          refresh_token: bypassData.refresh_token,
        });
        if (setErr) throw setErr;
        sessionStorage.setItem("phone_verified", phoneE164);
        setVerifying(false);
        navigate("/app/signup");
        return;
      }
    } catch (_) {
      // fall through to standard Twilio verifyOtp
    }

    const { error } = await supabase.auth.verifyOtp({
      phone: phoneE164,
      token: code,
      type: "sms",
    });
    setVerifying(false);
    if (error) {
      setError("Invalid or expired code. Please try again.");
      setDigits(Array(digits.length).fill(""));
      inputRefs.current[0]?.focus();
      return;
    }
    sessionStorage.setItem("phone_verified", phoneE164);
    navigate("/app/signup");
  };


  const handleResend = async () => {
    if (!phoneE164) return;
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneE164,
      options: { channel: "sms" },
    });
    if (error) {
      setError(error.message || "Could not resend code.");
      return;
    }
    setTimer(59);
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
        <div className="flex gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              maxLength={1}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-11 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-[#F97316] focus:outline-none"
            />
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          onClick={handleConfirm}
          disabled={!digits.every((d) => d.length === 1) || verifying}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors"
        >
          {verifying ? "Verifying…" : "Confirm"}
        </button>
        <p className="text-sm text-gray-500">
          {timer > 0 ? `Resend in 0:${timer.toString().padStart(2, "0")}` : (
            <button onClick={handleResend} className="text-[#F97316] font-semibold">Resend</button>
          )}
        </p>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerVerification;
