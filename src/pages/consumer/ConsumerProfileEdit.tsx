import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, ImageIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import AvatarCropDialog from "@/components/consumer/AvatarCropDialog";
import { toast } from "sonner";
import {
  AVATAR_ALLOWED_TYPES,
  getAvatarSignedUrl,
  removeAvatarFile,
  uploadAvatar,
} from "@/lib/avatars";

const EMPTY = { first_name: "", last_name: "", phone: "", zip_code: "" };

const ConsumerProfileEdit = () => {
  const navigate = useNavigate();
  const { consumer, user, loading, refreshConsumer } = useConsumerAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState("avatar.jpg");

  // ITEM 1: sync form state once the async consumer fetch completes,
  // so fields prefill instead of being overwritten with blanks on save.
  useEffect(() => {
    if (!consumer) return;
    setForm({
      first_name: consumer.first_name || "",
      last_name: consumer.last_name || "",
      phone: consumer.phone || "",
      zip_code: consumer.zip_code || "",
    });
    setAvatarPath((consumer as any)?.avatar_url ?? null);
    setHydrated(true);
  }, [consumer]);

  useEffect(() => {
    getAvatarSignedUrl(avatarPath).then(setAvatarUrl);
  }, [avatarPath]);

  const persistAvatar = async (path: string | null) => {
    if (!user) return;
    await supabase.from("consumers").update({ avatar_url: path }).eq("user_id", user.id);
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      toast.error("Photo must be PNG, JPG, or WEBP");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropFileName(file.name);
      setCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ITEM 5: crop dialog returns a square File; upload the cropped result.
  const handleCropped = async (croppedFile: File) => {
    if (!user) return;
    setCropSrc(null);
    setUploading(true);
    try {
      const path = await uploadAvatar(user.id, croppedFile);
      if (avatarPath && avatarPath !== path) await removeAvatarFile(avatarPath);
      await persistAvatar(path);
      setAvatarPath(path);
      await refreshConsumer();
      toast.success("Photo updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
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
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
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
        .select("id, invite_code_used")
        .eq("user_id", user.id)
        .maybeSingle();

      let error;
      if (existing?.id) {
        ({ error } = await supabase.from("consumers").update(form).eq("id", existing.id));
      } else {
        // ITEM 2: RLS requires invite_code_used to match an active invite code.
        // Pull it from the existing row (if any), auth metadata, or session storage.
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const invite_code_used =
          (existing as any)?.invite_code_used ||
          (typeof meta.invite_code === "string" ? meta.invite_code : "") ||
          sessionStorage.getItem("invite_code") ||
          "";

        if (!invite_code_used) {
          toast.error("We can't create your profile without your original invite code. Please sign out and re-enter it, or contact support.");
          setSaving(false);
          return;
        }

        ({ error } = await supabase.from("consumers").insert({
          ...form,
          user_id: user.id,
          email: user.email,
          invite_code_used,
        }));
      }

      if (error) {
        // ITEM 2: hide raw RLS text behind a friendly message.
        const raw = (error.message || "").toLowerCase();
        if (raw.includes("row-level security") || raw.includes("row level security") || raw.includes("violates row")) {
          toast.error("We couldn't save your profile. Please contact support so we can restore your account.");
        } else {
          toast.error(error.message || "Could not save profile.");
        }
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

  const canSave = hydrated && !loading && !saving;

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

        {!hydrated && (
          <p className="text-xs text-gray-400">Loading your profile...</p>
        )}

        {(["first_name", "last_name", "phone", "zip_code"] as const).map((key) => (
          <div key={key}>
            <label className="text-sm text-gray-600 mb-1 block capitalize">{key.replace("_", " ")}</label>
            <input
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              disabled={!hydrated}
              className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316] disabled:bg-gray-50"
            />
          </div>
        ))}
        <button onClick={handleSave} disabled={!canSave}
          className="w-full py-3 rounded-full bg-[#F97316] text-white font-bold text-lg shadow-lg hover:bg-[#EA6C10] disabled:opacity-50 transition-colors mt-2">
          {saving ? "Saving..." : hydrated ? "Save" : "Loading..."}
        </button>
      </div>

      <AvatarCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        fileName={cropFileName}
        onClose={() => setCropSrc(null)}
        onCropped={handleCropped}
      />
    </ConsumerMobileLayout>
  );
};

export default ConsumerProfileEdit;
