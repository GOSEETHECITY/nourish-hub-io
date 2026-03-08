import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { validatePassword } from "@/lib/validatePassword";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import PasswordInput from "@/components/ui/password-input";
import type { Organization } from "@/types/database";

export default function VenueSettings() {
  const { profile, user } = useAuth();
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: org } = useQuery({
    queryKey: ["venue-org", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*").eq("id", profile!.organization_id!).single();
      if (error) throw error;
      return data as Organization;
    },
    enabled: !!profile?.organization_id,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || "", last_name: profile.last_name || "",
        email: profile.email || user?.email || "", phone: profile.phone || "",
      });
    }
  }, [profile, user]);

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

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Organization profile and account settings</p>
      </div>

      {org && (
        <section className="bg-card rounded-xl border p-6 space-y-3">
          <h2 className="text-lg font-bold text-foreground">Organization</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground uppercase">Name</p><p className="text-sm text-foreground mt-1">{org.name}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Contact Email</p><p className="text-sm text-foreground mt-1">{org.primary_contact_email || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Contact Phone</p><p className="text-sm text-foreground mt-1">{org.primary_contact_phone || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase">Address</p><p className="text-sm text-foreground mt-1">{[org.address, org.city, org.state].filter(Boolean).join(", ") || "—"}</p></div>
          </div>
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
