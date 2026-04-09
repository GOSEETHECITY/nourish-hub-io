import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerDecorativeBackground from "@/components/consumer/ConsumerDecorativeBackground";

const ConsumerResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setIsRecovery(true);
  }, []);

  const handleUpdate = async () => {
    setError("");
    if (!password) { setError("Password is required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateErr) { setError(updateErr.message); return; }
    navigate("/app/login");
  };

  if (!isRecovery) {
    return (
      <ConsumerMobileLayout className="flex flex-col items-center justify-center overflow-hidden">
        <ConsumerDecorativeBackground />
        <div className="relative z-10 flex flex-col items-center gap-5 px-8 w-full">
          <h1 className="text-3xl font-extrabold">
            <span className="text-[#F97316]">GO</span>{" "}
            <span className="text-[#1B2A4A]">See The City</span>
          </h1>
          <p className="text-gray-500 text-sm">Invalid or expired reset link.</p>
          <button onClick={() => navigate("/app/login")}
            className="px-6 py-2.5 bg-[#F97316] text-white rounded-full font-semibold text-sm hover:bg-[#EA6C10] transition-colors">
            Back to Login
          </button>
        </div>
      </ConsumerMobileLayout>
    );
  }

  return (
    <ConsumerMobileLayout className="flex flex-col items-center justify-center overflow-hidden">
      <ConsumerDecorativeBackground />
      <div className="relative z-10 flex flex-col items-center gap-5 px-8 w-full">
        <h1 className="text-3xl font-extrabold">
          <span className="text-[#F97316]">GO</span>{" "}
          <span className="text-[#1B2A4A]">See The City</span>
        </h1>
        <p className="text-lg font-bold text-[#1B2A4A]">Set new password</p>
        <div className="relative w-full">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPw ? "text" : "password"}
            placeholder="New password"
            className="w-full py-3 px-4 pr-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316] placeholder:text-gray-400"
          />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          placeholder="Confirm password"
          className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316] placeholder:text-gray-400"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button onClick={handleUpdate} disabled={loading}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors">
          {loading ? "Updating..." : "Update password"}
        </button>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerResetPassword;
