import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerSignup = () => {
  const navigate = useNavigate();
  const { refreshConsumer } = useConsumerAuth();
  const phone = sessionStorage.getItem("signup_phone") || "";
  const inviteCode = sessionStorage.getItem("invite_code") || "";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone,
    zip: "",
    city: "",
    dob: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    const { data, error: authErr } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app/home`,
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          phone: form.phone,
        },
      },
    });

    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await new Promise((r) => setTimeout(r, 500));
      await supabase.from("consumers").insert({
        user_id: data.user.id,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email.trim(),
        phone: form.phone,
        zip_code: form.zip,
        city: form.city,
        date_of_birth: form.dob || null,
        invite_code_used: inviteCode,
      });
      await refreshConsumer();
    }

    setLoading(false);
    navigate("/app/home");
  };

  return (
    <ConsumerMobileLayout className="flex flex-col px-6 py-8">
      <h1 className="text-2xl font-bold mb-6 text-[#1B2A4A]">Create your account</h1>
      <div className="flex flex-col gap-3">
        <input
          placeholder="First name"
          value={form.firstName}
          onChange={(e) => update("firstName", e.target.value)}
          className="w-full py-3 px-4 rounded-xl border border-gray-300"
        />
        <input
          placeholder="Last name"
          value={form.lastName}
          onChange={(e) => update("lastName", e.target.value)}
          className="w-full py-3 px-4 rounded-xl border border-gray-300"
        />
        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="w-full py-3 px-4 rounded-xl border border-gray-300"
        />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          className="w-full py-3 px-4 rounded-xl border border-gray-300"
        />
        <input
          placeholder="ZIP"
          value={form.zip}
          onChange={(e) => update("zip", e.target.value)}
          className="w-full py-3 px-4 rounded-xl border border-gray-300"
        />
        <input
          placeholder="City"
          value={form.city}
          onChange={(e) => update("city", e.target.value)}
          className="w-full py-3 px-4 rounded-xl border border-gray-300"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[#F97316] text-white font-semibold disabled:opacity-50 mt-2"
        >
          {loading ? "Creating..." : "Sign up"}
        </button>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerSignup;
