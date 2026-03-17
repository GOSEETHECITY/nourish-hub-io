import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerDecorativeBackground from "@/components/consumer/ConsumerDecorativeBackground";

const ConsumerLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authErr) { setError(authErr.message); return; }
    navigate("/app/home");
  };

  return (
    <ConsumerMobileLayout className="flex flex-col items-center justify-center overflow-hidden">
      <ConsumerDecorativeBackground />
      <div className="relative z-10 flex flex-col items-center gap-5 px-8 w-full">
        <div className="text-3xl font-extrabold">
          <span className="text-[#F97316]">GO</span>{" "}
          <span className="text-[#1B2A4A]">See The City</span>
        </div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email"
          className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password"
          className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]" />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button onClick={handleLogin} disabled={loading}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors">
          {loading ? "Logging in..." : "Login"}
        </button>
        <button className="text-sm text-gray-500 underline">Forgot password?</button>
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <button onClick={() => navigate("/app/invite-code")} className="text-[#F97316] font-semibold">Sign up</button>
        </p>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerLogin;
