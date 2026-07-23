import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import PasswordInput from "@/components/ui/password-input";

const ConsumerSignup = () => {
  const navigate = useNavigate();
  const { refreshConsumer } = useConsumerAuth();
  const phone = sessionStorage.getItem("signup_phone") || "";
  const phoneE164 = sessionStorage.getItem("signup_phone_e164") || "";
  const phoneVerified = sessionStorage.getItem("phone_verified") || "";
  const inviteCode = sessionStorage.getItem("invite_code") || "";
  const submittedRef = useRef(false);

  // Hard gate: signup is only reachable after a verified phone OTP and a
  // captured invite code. The DB also enforces the invite-code requirement,
  // but blocking client-side avoids a noisy round-trip.
  useEffect(() => {
    if (submittedRef.current) return;
    if (!inviteCode) {
      navigate("/app/invite", { replace: true });
      return;
    }
    if (!phoneVerified || phoneVerified !== phoneE164) {
      navigate("/app/phone-entry", { replace: true });
    }
  }, [inviteCode, phoneVerified, phoneE164, navigate]);

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
    if (!inviteCode) {
      setError("Invite code is required.");
      return;
    }
    setLoading(true);

    // Phone OTP verification already created an authenticated session.
    // Attach the email + password to that user so they can sign in later.
    const { data: updated, error: updateErr } = await supabase.auth.updateUser({
      email: form.email.trim(),
      password: form.password,
      data: {
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
      },
    });

    if (updateErr || !updated.user) {
      setError(updateErr?.message || "Could not complete signup.");
      setLoading(false);
      return;
    }

    // A DB trigger auto-creates an empty consumers row on phone verification,
    // so check for an existing row first and UPDATE it; only INSERT if none
    // exists. Matches the pattern in ConsumerProfileEdit handleSave.
    const consumerPayload = {
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email.trim(),
      phone: form.phone,
      zip_code: form.zip,
      city: form.city,
      date_of_birth: form.dob || null,
    };

    const { data: existingConsumer } = await supabase
      .from("consumers")
      .select("id")
      .eq("user_id", updated.user.id)
      .maybeSingle();

    let insertErr;
    if (existingConsumer?.id) {
      ({ error: insertErr } = await supabase
        .from("consumers")
        .update(consumerPayload)
        .eq("id", existingConsumer.id));
    } else {
      ({ error: insertErr } = await supabase.from("consumers").insert({
        ...consumerPayload,
        user_id: updated.user.id,
        invite_code_used: inviteCode,
      }));
    }

    if (insertErr) {
      setError(insertErr.message);
      setLoading(false);
      return;
    }


    await refreshConsumer();

    // If the user was invited by a friend, record the referral and award the referrer's badge.
    // Try both the optional friend referral code and the invite code itself — the invite code
    // may be a friend's personal referral code, or a general campaign code (e.g. GOSEE2026)
    // in which case apply_referral finds no matching referrer and no-ops.
    const referralCode = sessionStorage.getItem("referral_code");
    if (referralCode) {
      try { await supabase.rpc("apply_referral" as any, { p_code: referralCode }); } catch (_) {}
      sessionStorage.removeItem("referral_code");
    }
    if (inviteCode) {
      try { await supabase.rpc("apply_referral" as any, { p_code: inviteCode }); } catch (_) {}
    }

    sessionStorage.removeItem("phone_verified");
    sessionStorage.removeItem("signup_phone_e164");
    submittedRef.current = true;
    setLoading(false);
    navigate("/app/home");
  };

  return (
    <ConsumerMobileLayout className="flex flex-col">
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-6 h-6 text-[#1B2A4A]" />
        </button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Create your account</h1>
      </header>
      <div className="px-6 pb-8">
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
        <PasswordInput
          placeholder="Password"
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
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerSignup;
