import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerDecorativeBackground from "@/components/consumer/ConsumerDecorativeBackground";

const ConsumerForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    setLoading(true);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/app/reset-password`,
    });
    setLoading(false);
    if (resetErr) { setError(resetErr.message); return; }
    setSent(true);
  };

  return (
    <ConsumerMobileLayout className="flex flex-col items-center justify-center overflow-hidden">
      <ConsumerDecorativeBackground />
      <div className="relative z-10 flex flex-col items-center gap-5 px-8 w-full">
        <button onClick={() => navigate("/app/login")} className="self-start flex items-center gap-1 text-sm text-gray-500">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>
        <h1 className="text-3xl font-extrabold">
          <span className="text-[#F97316]">GO</span>{" "}
          <span className="text-[#1B2A4A]">See The City</span>
        </h1>
        <p className="text-lg font-bold text-[#1B2A4A]">Reset password</p>
        <p className="text-sm text-gray-500 text-center">Enter your email and we'll send a reset link</p>

        {sent ? (
          <div className="w-full space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 text-center">
              Check your email for a password reset link.
            </div>
            <button onClick={() => navigate("/app/login")}
              className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] transition-colors">
              Back to Login
            </button>
          </div>
        ) : (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@email.com"
              className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316] placeholder:text-gray-400"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={handleReset} disabled={loading}
              className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors">
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </>
        )}
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerForgotPassword;
