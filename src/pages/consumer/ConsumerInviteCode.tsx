import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerDecorativeBackground from "@/components/consumer/ConsumerDecorativeBackground";

const ConsumerInviteCode = () => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!inviteCode.trim()) { setError("Please enter a code"); return; }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("validate_and_use_invite_code", {
        code_input: inviteCode.trim().toUpperCase(),
      });
      const result = data as any;
      if (rpcError || !result?.valid) {
        setError(result?.message || "Invalid or expired invite code");
        return;
      }
      sessionStorage.setItem("invite_code", inviteCode.trim().toUpperCase());
      navigate("/app/phone-entry");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConsumerMobileLayout className="flex flex-col items-center justify-center overflow-hidden">
      <ConsumerDecorativeBackground />
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 w-full">
        <div className="text-3xl font-extrabold tracking-tight">
          <span className="text-[#F97316]">GO</span>{" "}
          <span className="text-[#1B2A4A]">See The City</span>
        </div>
        <p className="text-xl font-bold text-[#1B2A4A]">Enter invitation code</p>
        <input
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="Enter code"
          className="w-full py-3 px-4 rounded-full border border-gray-300 text-center text-lg uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#F97316]"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] transition-colors disabled:opacity-50"
        >
          {loading ? "Validating..." : "Join"}
        </button>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerInviteCode;
