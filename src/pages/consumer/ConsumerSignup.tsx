import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerSignup = () => {
  const navigate = useNavigate();
  const phone = sessionStorage.getItem("signup_phone") || "";
  const inviteCode = sessionStorage.getItem("invite_code") || "";

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", phone, zip: "", city: "", dob: "" });
  const [showPw, setShowPw] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    setError("");
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.city) { setError("All required fields must be filled"); return; }
    if (!termsAccepted) { setError("Please accept terms and conditions"); return; }
    setLoading(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { first_name: form.firstName, last_name: form.lastName } },
      });
      if (authErr) { setError(authErr.message); return; }
      if (authData.user) {
        const { error: insertErr } = await supabase.from("consumers").insert({
          user_id: authData.user.id,
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone,
          zip_code: form.zip,
          city: form.city,
          date_of_birth: form.dob || null,
          invite_code_used: inviteCode || null,
        });
        if (insertErr) { setError(insertErr.message); setLoading(false); return; }

        // Update city_thresholds
        const cityLower = form.city.trim();
        if (cityLower) {
          const { data: existing } = await supabase.from("city_thresholds").select("*").ilike("city", cityLower).maybeSingle();
          if (existing) {
            await supabase.from("city_thresholds").update({
              current_consumer_count: existing.current_consumer_count + 1,
            }).eq("id", existing.id);
          } else {
            await supabase.from("city_thresholds").insert({
              city: form.city.trim(),
              state: form.zip ? null : null,
              current_consumer_count: 1,
            });
          }
        }
      }
      // Check for redirect
      const redirect = sessionStorage.getItem("redirect_after_signup");
      if (redirect) {
        sessionStorage.removeItem("redirect_after_signup");
        navigate(redirect);
      } else {
        navigate("/app/location-permission");
      }
    } catch { setError("Something went wrong"); } finally { setLoading(false); }
  };

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Sign up</h1>
      </header>
      <div className="px-6 pt-4 flex flex-col gap-4 pb-8">
        <div className="text-2xl font-extrabold text-center">
          <span className="text-[#F97316]">GO</span> <span className="text-[#1B2A4A]">See The City</span>
        </div>
        {[
          { key: "firstName", label: "First name *", type: "text" },
          { key: "lastName", label: "Last name *", type: "text" },
          { key: "email", label: "Email *", type: "email" },
        ].map(({ key, label, type }) => (
          <div key={key}>
            <label className="text-sm text-gray-600 mb-1 block">{label}</label>
            <input value={(form as any)[key]} onChange={(e) => update(key, e.target.value)} type={type}
              className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]" />
          </div>
        ))}
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Password *</label>
          <div className="relative">
            <input value={form.password} onChange={(e) => update("password", e.target.value)}
              type={showPw ? "text" : "password"}
              className="w-full py-3 px-4 pr-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Phone</label>
          <input value={form.phone} onChange={(e) => update("phone", e.target.value)} type="tel"
            className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]" />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Zip code</label>
          <input value={form.zip} onChange={(e) => update("zip", e.target.value)}
            className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]" />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">City *</label>
          <input value={form.city} onChange={(e) => update("city", e.target.value)}
            className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            placeholder="Enter your city" />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Date of birth</label>
          <div className="relative">
            <input value={form.dob} onChange={(e) => update("dob", e.target.value)} type="date"
              className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]" />
            <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 accent-[#F97316]" />
          <span>
            I accept the{" "}
            <button type="button" onClick={() => setShowTerms(true)} className="text-[#F97316] underline">Terms and Conditions</button>
          </span>
        </label>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors">
          {loading ? "Creating account..." : "Next"}
        </button>
      </div>
      {showTerms && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Terms and Conditions</h2>
            <p className="text-sm text-gray-600 mb-4">By using GO See The City, you agree to our terms of service and privacy policy. Your data is used to provide food rescue and discount services in your area.</p>
            <button onClick={() => setShowTerms(false)} className="w-full py-2 bg-[#F97316] text-white rounded-full font-semibold">Close</button>
          </div>
        </div>
      )}
    </ConsumerMobileLayout>
  );
};

export default ConsumerSignup;
