import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerDecorativeBackground from "@/components/consumer/ConsumerDecorativeBackground";

const ConsumerWaitlist = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) { setError("Email is required"); return; }
    if (!city.trim()) { setError("City is required"); return; }
    setLoading(true);
    const { error: insertErr } = await supabase.from("waitlist_signups" as any).insert({
      email: email.trim(),
      city: city.trim(),
      zip: zip.trim() || null,
    } as any);
    setLoading(false);
    if (insertErr) { setError(insertErr.message); return; }
    setSubmitted(true);
  };

  return (
    <ConsumerMobileLayout className="flex flex-col items-center justify-center overflow-hidden">
      <ConsumerDecorativeBackground />
      <div className="relative z-10 flex flex-col items-center gap-5 px-8 w-full">
        <button onClick={() => navigate("/app/invite-code")} className="self-start flex items-center gap-1 text-sm text-gray-500">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-3xl font-extrabold">
          <span className="text-[#F97316]">GO</span>{" "}
          <span className="text-[#1B2A4A]">See The City</span>
        </h1>
        <p className="text-lg font-bold text-[#1B2A4A]">Join the waitlist</p>

        {submitted ? (
          <div className="w-full space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 text-center">
              Thanks! We'll email you when GO See The City launches in {city}.
            </div>
            <button onClick={() => navigate("/app/invite-code")}
              className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] transition-colors">
              Done
            </button>
          </div>
        ) : (
          <>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              placeholder="you@email.com"
              className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316] placeholder:text-gray-400" />
            <input value={city} onChange={(e) => setCity(e.target.value)}
              placeholder="City *"
              className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316] placeholder:text-gray-400" />
            <input value={zip} onChange={(e) => setZip(e.target.value)}
              placeholder="Zip code (optional)"
              className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316] placeholder:text-gray-400" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors">
              {loading ? "Submitting..." : "Join Waitlist"}
            </button>
          </>
        )}
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerWaitlist;
