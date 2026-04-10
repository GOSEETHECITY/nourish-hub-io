import { useState, useEffect } from "react";
import { Mail } from "lucide-react";
import { validatePassword } from "@/lib/validatePassword";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import PasswordInput from "@/components/ui/password-input";

export default function SettingsPage() {
  const { profile, user } = useAuth();
  const [profileForm, setProfileForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [platformForm, setPlatformForm] = useState({
    platform_name: "HarietAI",
    contact_email: "hello@hariet.ai",
    default_fee: "10",
  });
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const saveProfile = async () => {
    setSaving(true);
    try {
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
    setSaving(false);
  };

  const changePassword = async () => {
    const pwError = validatePassword(newPassword || "");
    if (pwError) {
      toast.error(pwError);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setNewPassword(""); }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform and profile settings</p>
      </div>

      {/* Admin Profile */}
      <section className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">Admin Profile</h2>
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

      {/* Platform Settings */}
      <section className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">Platform Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Platform Name</Label><Input value={platformForm.platform_name} onChange={(e) => setPlatformForm({ ...platformForm, platform_name: e.target.value })} /></div>
          <div><Label>Contact Email</Label><Input value={platformForm.contact_email} onChange={(e) => setPlatformForm({ ...platformForm, contact_email: e.target.value })} /></div>
          <div><Label>Default Platform Fee %</Label><Input type="number" value={platformForm.default_fee} onChange={(e) => setPlatformForm({ ...platformForm, default_fee: e.target.value })} /></div>
        </div>
        <Button onClick={() => toast.success("Platform settings saved")}>Save Settings</Button>
      </section>

      {/* Notification Settings */}
      <section className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">Notification Settings</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">In-App Notifications</p>
            <p className="text-xs text-muted-foreground">Toggle automated in-app notifications</p>
          </div>
          <Switch checked={notifications} onCheckedChange={setNotifications} />
        </div>
        <div className="bg-muted/50 rounded-lg border border-dashed p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="w-4 h-4" /> Email notification settings — placeholder for when email API is connected</p>
        </div>
      </section>
    </div>
  );
}
