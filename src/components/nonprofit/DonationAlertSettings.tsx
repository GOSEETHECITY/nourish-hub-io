import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { geocode } from "@/lib/cityCenter";

const db = supabase as any;

export default function DonationAlertSettings({ nonprofitId }: { nonprofitId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ radius_miles: "25", email_enabled: true, sms_enabled: false, alert_email: "", alert_phone: "" });
  const [saving, setSaving] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["np-alert-settings", nonprofitId],
    queryFn: async () => (await db.from("nonprofit_alert_settings").select("*").eq("nonprofit_id", nonprofitId).maybeSingle()).data,
  });

  useEffect(() => {
    if (existing) setForm({
      radius_miles: String(existing.radius_miles ?? 25), email_enabled: existing.email_enabled, sms_enabled: existing.sms_enabled,
      alert_email: existing.alert_email ?? "", alert_phone: existing.alert_phone ?? "",
    });
  }, [existing]);

  const save = async () => {
    if (form.sms_enabled && form.alert_phone.replace(/\D/g, "").length < 10) return toast.error("Enter a mobile number for text alerts");
    setSaving(true);
    try {
      // Locate the nonprofit's saved address so distance can be measured for each new donation.
      const { data: np } = await supabase.from("nonprofits").select("address, city, state, zip").eq("id", nonprofitId).maybeSingle();
      const addr = [np?.address, np?.city, np?.state, np?.zip].filter(Boolean).join(", ");
      const pos = addr ? (await geocode(addr)) ?? (np?.city ? await geocode([np.city, np.state].filter(Boolean).join(", ")) : null) : null;
      const { error } = await db.from("nonprofit_alert_settings").upsert({
        nonprofit_id: nonprofitId, radius_miles: Number(form.radius_miles), email_enabled: form.email_enabled,
        sms_enabled: form.sms_enabled, alert_email: form.alert_email.trim() || null, alert_phone: form.alert_phone.trim() || null,
        latitude: pos?.lat ?? existing?.latitude ?? null, longitude: pos?.lng ?? existing?.longitude ?? null,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["np-alert-settings"] });
      toast.success(pos || existing?.latitude ? "Alert settings saved" : "Saved, but we couldn't locate your address. Add a full address so alerts can be sent.");
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  return (
    <section className="bg-card rounded-xl border p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">New Donation Alerts</h2>
        <p className="text-sm text-muted-foreground">Get notified when a venue posts a donation within your radius.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Alert radius</Label>
          <Select value={form.radius_miles} onValueChange={(v) => setForm({ ...form, radius_miles: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5, 10, 25, 50, 100].map((m) => <SelectItem key={m} value={String(m)}>Within {m} miles</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div><Label>Email alerts</Label><p className="text-xs text-muted-foreground">Uses your primary contact email unless you set one below.</p></div>
        <Switch checked={form.email_enabled} onCheckedChange={(v) => setForm({ ...form, email_enabled: v })} />
      </div>
      {form.email_enabled && <div><Label>Alert email (optional)</Label><Input type="email" value={form.alert_email} onChange={(e) => setForm({ ...form, alert_email: e.target.value })} /></div>}
      <div className="flex items-center justify-between gap-4">
        <div><Label>Text message alerts</Label><p className="text-xs text-muted-foreground">Message and data rates may apply.</p></div>
        <Switch checked={form.sms_enabled} onCheckedChange={(v) => setForm({ ...form, sms_enabled: v })} />
      </div>
      {form.sms_enabled && <div><Label>Mobile number</Label><Input type="tel" value={form.alert_phone} onChange={(e) => setForm({ ...form, alert_phone: e.target.value })} placeholder="(555) 555-5555" /></div>}
      <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save alert settings"}</Button>
    </section>
  );
}
