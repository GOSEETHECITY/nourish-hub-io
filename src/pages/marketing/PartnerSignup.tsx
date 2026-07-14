import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

const TYPES = ["restaurant", "hospitality", "venue_events_group", "farm_grocery", "government", "nonprofit"];

export default function PartnerSignup() {
  const [f, setF] = useState({
    organization_name: "", organization_type: "restaurant", address: "", city: "", state: "", zip_code: "",
    contact_name: "", contact_email: "", contact_phone: "", ein: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("onboarding_submissions").insert({
      organization_name: f.organization_name,
      organization_type: f.organization_type,
      address: f.address, city: f.city, state: f.state, zip_code: f.zip_code,
      contact_name: f.contact_name, contact_email: f.contact_email, contact_phone: f.contact_phone,
      ein: f.ein || null,
    });
    setSubmitting(false);
    if (error) { toast({ title: "Submission failed", description: error.message, variant: "destructive" }); return; }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <MarketingNav />
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Become a Partner</h1>
        <p className="text-muted-foreground mb-8">Apply to join the HarietAI network. We review every application and email your credentials on approval.</p>
        {done ? (
          <Card><CardContent className="py-16 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application received</h2>
            <p className="text-muted-foreground">We will review your submission and email you at <strong>{f.contact_email}</strong>.</p>
          </CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Organization details</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div><Label>Organization name *</Label><Input required value={f.organization_name} onChange={(e) => setF({ ...f, organization_name: e.target.value })} /></div>
                <div><Label>Organization type *</Label>
                  <select className="w-full border rounded-md h-10 px-3" value={f.organization_type} onChange={(e) => setF({ ...f, organization_type: e.target.value })}>
                    {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                {f.organization_type === "nonprofit" && (
                  <div><Label>EIN (required for nonprofits) *</Label><Input required value={f.ein} onChange={(e) => setF({ ...f, ein: e.target.value })} placeholder="12-3456789" /></div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Address</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
                  <div><Label>City</Label><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
                  <div><Label>State</Label><Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} maxLength={2} /></div>
                  <div><Label>ZIP</Label><Input value={f.zip_code} onChange={(e) => setF({ ...f, zip_code: e.target.value })} /></div>
                </div>
                <div><Label>Contact name *</Label><Input required value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></div>
                <div><Label>Contact email *</Label><Input required type="email" value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></div>
                <div><Label>Contact phone</Label><Input value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} /></div>
                <div><Label>Anything else we should know?</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
                <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Submitting…" : "Submit application"}</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
      <MarketingFooter />
    </div>
  );
}
