import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { validatePassword } from "@/lib/validatePassword";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, ImageIcon, Trash2 } from "lucide-react";
import PasswordInput from "@/components/ui/password-input";
import StripeConnectSection from "@/components/venue/StripeConnectSection";
import type { Organization } from "@/types/database";
import {
  DAY_KEYS,
  DAY_LABELS,
  defaultHours,
  getLogoSignedUrl,
  isValidEmail,
  isValidPhone,
  type HoursOfOperation,
} from "@/lib/orgProfile";

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export default function VenueSettings() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [orgForm, setOrgForm] = useState({
    business_bio: "",
    primary_contact_name: "",
    primary_contact_email: "",
    primary_contact_phone: "",
  });
  const [hours, setHours] = useState<HoursOfOperation>(defaultHours());
  const [savingOrg, setSavingOrg] = useState(false);
  const [logoSignedUrl, setLogoSignedUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data: org } = useQuery({
    queryKey: ["venue-org", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*").eq("id", profile!.organization_id!).single();
      if (error) throw error;
      return data as unknown as Organization & {
        business_bio: string | null;
        hours_of_operation: HoursOfOperation | null;
        logo_url: string | null;
      };
    },
    enabled: !!profile?.organization_id,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || user?.email || "",
        phone: profile.phone || "",
      });
    }
  }, [profile, user]);

  useEffect(() => {
    if (org) {
      setOrgForm({
        business_bio: org.business_bio || "",
        primary_contact_name: org.primary_contact_name || "",
        primary_contact_email: org.primary_contact_email || "",
        primary_contact_phone: org.primary_contact_phone || "",
      });
      setHours(org.hours_of_operation ?? defaultHours());
      getLogoSignedUrl(org.logo_url).then(setLogoSignedUrl);
    }
  }, [org]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      if (profileForm.phone && !isValidPhone(profileForm.phone)) {
        throw new Error("Please enter a valid phone number");
      }
      const { error } = await supabase.from("profiles").update({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        phone: profileForm.phone,
      }).eq("id", user!.id);
      if (error) throw error;
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSavingProfile(false);
  };

  const changePassword = async () => {
    const pwError = validatePassword(newPassword || "");
    if (pwError) { toast.error(pwError); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setNewPassword(""); }
  };

  const saveOrgProfile = async () => {
    if (!org) return;
    if (orgForm.primary_contact_email && !isValidEmail(orgForm.primary_contact_email)) {
      toast.error("Please enter a valid contact email"); return;
    }
    if (orgForm.primary_contact_phone && !isValidPhone(orgForm.primary_contact_phone)) {
      toast.error("Please enter a valid contact phone"); return;
    }
    setSavingOrg(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          business_bio: orgForm.business_bio || null,
          primary_contact_name: orgForm.primary_contact_name || null,
          primary_contact_email: orgForm.primary_contact_email || null,
          primary_contact_phone: orgForm.primary_contact_phone || null,
          hours_of_operation: hours as any,
        })
        .eq("id", org.id);
      if (error) throw error;
      toast.success("Organization profile saved");
      queryClient.invalidateQueries({ queryKey: ["venue-org", org.id] });
    } catch (e: any) {
      toast.error(e.message);
    }
    setSavingOrg(false);
  };

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !org) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      toast.error("Logo must be PNG, JPG, WEBP, or SVG"); return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo must be under 2 MB"); return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${org.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("organization-logos")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (upErr) throw upErr;

      // Remove any previous logo files for this org (best-effort)
      if (org.logo_url && !/^https?:\/\//i.test(org.logo_url) && org.logo_url !== path) {
        await supabase.storage.from("organization-logos").remove([org.logo_url]);
      }

      const { error: dbErr } = await supabase
        .from("organizations")
        .update({ logo_url: path })
        .eq("id", org.id);
      if (dbErr) throw dbErr;

      const signed = await getLogoSignedUrl(path);
      setLogoSignedUrl(signed);
      toast.success("Logo uploaded");
      queryClient.invalidateQueries({ queryKey: ["venue-org", org.id] });
    } catch (e: any) {
      toast.error(e.message ?? "Logo upload failed");
    }
    setUploadingLogo(false);
  };

  const removeLogo = async () => {
    if (!org?.logo_url) return;
    setUploadingLogo(true);
    try {
      if (!/^https?:\/\//i.test(org.logo_url)) {
        await supabase.storage.from("organization-logos").remove([org.logo_url]);
      }
      const { error } = await supabase.from("organizations").update({ logo_url: null }).eq("id", org.id);
      if (error) throw error;
      setLogoSignedUrl(null);
      toast.success("Logo removed");
      queryClient.invalidateQueries({ queryKey: ["venue-org", org.id] });
    } catch (e: any) {
      toast.error(e.message);
    }
    setUploadingLogo(false);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <StripeConnectSection />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Organization profile and account settings</p>
      </div>

      {org && (
        <section className="bg-card rounded-xl border p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Organization Profile</h2>
            <p className="text-sm text-muted-foreground mt-1">This information appears on your dashboard and tax receipts.</p>
          </div>

          {/* Logo */}
          <div className="space-y-3">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl border bg-muted overflow-hidden flex items-center justify-center">
                {logoSignedUrl ? (
                  <img src={logoSignedUrl} alt={`${org.name} logo`} className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onLogoFile} />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadingLogo}>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingLogo ? "Uploading..." : org.logo_url ? "Replace logo" : "Upload logo"}
                </Button>
                {org.logo_url && (
                  <Button type="button" variant="ghost" onClick={removeLogo} disabled={uploadingLogo}>
                    <Trash2 className="w-4 h-4 mr-2" /> Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, or SVG. Max 2 MB.</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Business bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Business bio</Label>
            <Textarea
              id="bio"
              rows={4}
              maxLength={2000}
              placeholder="Tell donors and nonprofits about your organization..."
              value={orgForm.business_bio}
              onChange={(e) => setOrgForm({ ...orgForm, business_bio: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">{orgForm.business_bio.length}/2000</p>
          </div>

          <Separator />

          {/* Primary contact */}
          <div className="space-y-3">
            <Label className="text-base">Primary contact</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Name</Label>
                <Input value={orgForm.primary_contact_name} onChange={(e) => setOrgForm({ ...orgForm, primary_contact_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Email</Label>
                <Input type="email" value={orgForm.primary_contact_email} onChange={(e) => setOrgForm({ ...orgForm, primary_contact_email: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Phone</Label>
                <Input type="tel" value={orgForm.primary_contact_phone} onChange={(e) => setOrgForm({ ...orgForm, primary_contact_phone: e.target.value })} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Hours */}
          <div className="space-y-3">
            <Label className="text-base">Hours of operation</Label>
            <div className="space-y-2">
              {DAY_KEYS.map((d) => (
                <div key={d} className="grid grid-cols-[110px_1fr_1fr_auto] items-center gap-3">
                  <div className="text-sm text-foreground">{DAY_LABELS[d]}</div>
                  <Input
                    type="time"
                    value={hours[d].open}
                    disabled={hours[d].closed}
                    onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], open: e.target.value } })}
                  />
                  <Input
                    type="time"
                    value={hours[d].close}
                    disabled={hours[d].closed}
                    onChange={(e) => setHours({ ...hours, [d]: { ...hours[d], close: e.target.value } })}
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={hours[d].closed}
                      onCheckedChange={(v) => setHours({ ...hours, [d]: { ...hours[d], closed: v } })}
                    />
                    <span className="text-xs text-muted-foreground">Closed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={saveOrgProfile} disabled={savingOrg}>{savingOrg ? "Saving..." : "Save Organization Profile"}</Button>
        </section>
      )}

      <section className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">Your Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>First Name</Label><Input value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} /></div>
          <div><Label>Last Name</Label><Input value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={profileForm.email} disabled className="bg-muted" /></div>
          <div><Label>Phone</Label><Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></div>
        </div>
        <Button onClick={saveProfile} disabled={savingProfile}>{savingProfile ? "Saving..." : "Save Profile"}</Button>
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
