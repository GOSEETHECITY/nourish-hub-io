import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import { toast } from "sonner";

const ConsumerProfileEdit = () => {
  const navigate = useNavigate();
  const { consumer, user, refreshConsumer } = useConsumerAuth();
  const [form, setForm] = useState({
    first_name: consumer?.first_name || "",
    last_name: consumer?.last_name || "",
    phone: consumer?.phone || "",
    zip_code: consumer?.zip_code || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be signed in to save your profile.");
      return;
    }
    setSaving(true);
    try {
      // Look up the real consumer row by user_id (consumer.id may be a fallback)
      const { data: existing } = await supabase
        .from("consumers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let error;
      if (existing?.id) {
        ({ error } = await supabase
          .from("consumers")
          .update(form)
          .eq("id", existing.id));
      } else {
        // No row yet — create one tied to this auth user
        ({ error } = await supabase
          .from("consumers")
          .insert({ ...form, user_id: user.id, email: user.email }));
      }

      if (error) {
        console.error("Profile save error:", error);
        toast.error(error.message || "Could not save profile.");
        setSaving(false);
        return;
      }

      await refreshConsumer();
      toast.success("Profile updated");
      navigate("/app/profile");
    } catch (err: any) {
      console.error(err);
      toast.error("Something went wrong saving your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Edit Profile</h1>
      </header>
      <div className="px-6 flex flex-col gap-4 pb-8">
        {(["first_name", "last_name", "phone", "zip_code"] as const).map((key) => (
          <div key={key}>
            <label className="text-sm text-gray-600 mb-1 block capitalize">{key.replace("_", " ")}</label>
            <input value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]" />
          </div>
        ))}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors mt-2">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </ConsumerMobileLayout>
  );
};

export default ConsumerProfileEdit;
