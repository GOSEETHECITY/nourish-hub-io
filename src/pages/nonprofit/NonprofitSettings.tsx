import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { validatePassword } from "@/lib/validatePassword";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Upload, ImageIcon, Trash2 } from "lucide-react";
import PasswordInput from "@/components/ui/password-input";
import AvatarUploader from "@/components/AvatarUploader";
import { getLogoSignedUrl } from "@/lib/orgProfile";
import type { Nonprofit } from "@/types/database";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export default function NonprofitSettings() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [logoSignedUrl, setLogoSignedUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data: nonprofit } = useQuery({
    queryKey: ["my-nonprofit", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("nonprofits").select("*").eq("id", profile!.nonprofit_id!).single();
      if (error) throw error;
      return data as Nonprofit & { logo_url: string | null };
    },
    enabled: !!profile?.nonprofit_id,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || "", last_name: profile.last_name || "",
        email: profile.email || user?.email || "", phone: profile.phone || "",
      });
    }
  }, [profile, user]);

  useEffect(() => {
    if (nonprofit?.logo_url) getLogoSignedUrl(nonprofit.logo_url).then(setLogoSignedUrl);
    else setLogoSignedUrl(null);
  }, [nonprofit?.logo_url]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        first_name: profileForm.first_name, last_name: profileForm.last_name, phone: profileForm.phone,
      }).eq("id", user!.id);
      if (error) throw error;
      toast.success("Profile updated");
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const changePassword = async () => {
    const pwError = validatePassword(newPassword || "");
    if (pwError) { toast.error(pwError); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setNewPassword(""); }
  };

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !nonprofit) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) return toast.error("Logo must be PNG, JPG, WEBP, or SVG");
    if (file.size > MAX_LOGO_BYTES) return toast.error("Logo must be under 2 MB");
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${nonprofit.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("organization-logos")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (upErr) throw upErr;
      if (nonprofit.logo_url && !/^https?:\/\//i.test(nonprofit.logo_url) && nonprofit.logo_url !== path) {
        await supabase.storage.from("organization-logos").remove([nonprofit.logo_url]);
      }
      const { error } = await supabase.from("nonprofits").update({ logo_url: path }).eq("id", nonprofit.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["my-nonprofit"] });
      toast.success("Logo updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally { setUploadingLogo(false); }
  };

  const removeLogo = async () => {
    if (!nonprofit?.logo_url) return;
    setUploadingLogo(true);
    try {
      if (!/^https?:\/\//i.test(nonprofit.logo_url)) {
        await supabase.storage.from("organization-logos").remove([nonprofit.logo_url]);
      }
      const { error } = await supabase.from("nonprofits").update({ logo_url: null }).eq("id", nonprofit.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["my-nonprofit"] });
      toast.success("Logo removed");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploadingLogo(false); }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Organization profile and account settings</p>
      </div>

      {nonprofit && (
        <section className="bg-card rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Organization</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground uppercase">Name</p><p className="text-sm text-foreground mt-1">{nonprofit.organization_name}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">EIN</p><p className="text-sm text-foreground mt-1">{nonprofit.ein || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Contact</p><p className="text-sm text-foreground mt-1">{nonprofit.primary_contact_email || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Address</p><p className="text-sm text-foreground mt-1">{[nonprofit.address, nonprofit.city, nonprofit.state].filter(Boolean).join(", ") || "—"}</p></div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Organization logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border bg-muted overflow-hidden flex items-center justify-center">
                {logoSignedUrl
                  ? <img src={logoSignedUrl} alt={`${nonprofit.organization_name} logo`} className="w-full h-full object-contain" />
                  : <ImageIcon className="w-7 h-7 text-muted-foreground" />}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onLogoFile} />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadingLogo}>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingLogo ? "Uploading..." : nonprofit.logo_url ? "Replace logo" : "Upload logo"}
                </Button>
                {nonprofit.logo_url && (
                  <Button type="button" variant="ghost" onClick={removeLogo} disabled={uploadingLogo}>
                    <Trash2 className="w-4 h-4 mr-2" /> Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, or SVG. Max 2 MB.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">Your Profile</h2>
        {user && <AvatarUploader userId={user.id} currentPath={(profile as any)?.avatar_url ?? null} />}
        <div className="grid grid-cols-2 gap-4">
          <div><Label>First Name</Label><Input value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} /></div>
          <div><Label>Last Name</Label><Input value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={profileForm.email} disabled className="bg-muted" /></div>
          <div><Label>Phone</Label><Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></div>
        </div>
        <Button onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
        <Separator />
        <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
        <div className="flex gap-4">
          <PasswordInput placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="max-w-xs" />
          <Button variant="outline" onClick={changePassword}>Update Password</Button>
        </div>
      </section>
    </div>
  );
}
