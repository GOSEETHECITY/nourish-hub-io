import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, ImageIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import { toast } from "sonner";
import {
  AVATAR_ALLOWED_TYPES,
  getAvatarSignedUrl,
  removeAvatarFile,
  uploadAvatar,
} from "@/lib/avatars";

const ConsumerProfileEdit = () => {
  const navigate = useNavigate();
  const { consumer, user, refreshConsumer } = useConsumerAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    first_name: consumer?.first_name || "",
    last_name: consumer?.last_name || "",
    phone: consumer?.phone || "",
    zip_code: consumer?.zip_code || "",
  });
  const [saving, setSaving] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>((consumer as any)?.avatar_url ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getAvatarSignedUrl(avatarPath).then(setAvatarUrl);
  }, [avatarPath]);

  const persistAvatar = async (path: string | null) => {
    if (!user) return;
    await supabase.from("consumers").update({ avatar_url: path }).eq("user_id", user.id);
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = await uploadAvatar(user.id, file);
      if (avatarPath && avatarPath !== path) await removeAvatarFile(avatarPath);
      await persistAvatar(path);
      setAvatarPath(path);
      await refreshConsumer();
      toast.success("Photo updated");
    } catch (err: any) { toast.error(err.message ?? "Upload failed"); }
    finally { setUploading(false); }
  };

  const onRemove = async () => {
    if (!avatarPath) return;
    setUploading(true);
    try {
      await removeAvatarFile(avatarPath);
      await persistAvatar(null);
      setAvatarPath(null);
      await refreshConsumer();
      toast.success("Photo removed");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("You must be signed in to save your profile.");
      return;
    }
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("consumers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let error;
      if (existing?.id) {
        ({ error } = await supabase.from("consumers").update(form).eq("id", existing.id));
      } else {
        ({ error } = await supabase.from("consumers").insert({ ...form, user_id: user.id, email: user.email }));
      }

      if (error) {
        toast.error(error.message || "Could not save profile.");
        setSaving(false);
        return;
      }

      await refreshConsumer();
      toast.success("Profile updated");
      navigate("/app/profile");
    } catch (err: any) {
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
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full border bg-gray-100 overflow-hidden flex items-center justify-center">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-7 h-7 text-gray-400" />}
          </div>
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept={AVATAR_ALLOWED_TYPES.join(",")} className="hidden" onChange={onFile} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#F97316] text-white text-sm font-semibold disabled:opacity-50">
              <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : avatarPath ? "Replace" : "Upload photo"}
            </button>
            {avatarPath && (
              <button onClick={onRemove} disabled={uploading} className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Trash2 className="w-4 h-4" /> Remove
              </button>
            )}
          </div>
        </div>

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
