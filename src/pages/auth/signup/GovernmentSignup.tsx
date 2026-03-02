import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import SignupShell from "./SignupShell";
import ConfirmationScreen from "./ConfirmationScreen";

const GOV_TYPES = [
  { value: "municipal_government", label: "Municipal Government" },
  { value: "county_government", label: "County Government" },
  { value: "state_government", label: "State Government" },
];

interface Props {
  onBack: () => void;
}

export default function GovernmentSignup({ onBack }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [account, setAccount] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [gov, setGov] = useState({ name: "", type: "", regionCity: "", regionState: "", contactName: "", contactEmail: "", contactPhone: "", address: "", city: "", state: "", zip: "" });

  const handleSubmit = async () => {
    if (account.password !== account.confirmPassword) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: { data: { first_name: account.firstName, last_name: account.lastName } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");
      const userId = authData.user.id;

      await supabase.from("user_roles").insert({ user_id: userId, role: "government_partner" });

      const { data: orgData, error: orgError } = await supabase.from("organizations").insert({
        name: gov.name,
        type: gov.type as any,
        primary_contact_name: gov.contactName || null,
        primary_contact_email: gov.contactEmail || null,
        primary_contact_phone: gov.contactPhone || null,
        address: gov.address || null,
        city: gov.city || gov.regionCity || null,
        state: gov.state || gov.regionState || null,
        zip: gov.zip || null,
        county: gov.regionCity || null,
        approval_status: "pending",
      }).select().single();
      if (orgError) throw orgError;

      await supabase.from("profiles").update({
        first_name: account.firstName,
        last_name: account.lastName,
        phone: account.phone || null,
        organization_id: orgData.id,
      }).eq("id", userId);

      await supabase.auth.signOut();
      setStep(3);
    } catch (e: any) {
      toast.error(e.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <ConfirmationScreen message="Your government account request has been submitted and is pending approval. We will notify you once your account has been reviewed." />
    );
  }

  return (
    <SignupShell currentStep={step} totalSteps={3}>
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold text-foreground">Account Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name *</Label><Input value={account.firstName} onChange={(e) => setAccount({ ...account, firstName: e.target.value })} /></div>
            <div><Label>Last Name *</Label><Input value={account.lastName} onChange={(e) => setAccount({ ...account, lastName: e.target.value })} /></div>
          </div>
          <div><Label>Email *</Label><Input type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input type="tel" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} /></div>
          <div><Label>Password *</Label><Input type="password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} /></div>
          <div><Label>Confirm Password *</Label><Input type="password" value={account.confirmPassword} onChange={(e) => setAccount({ ...account, confirmPassword: e.target.value })} /></div>
          <Button className="w-full" onClick={() => setStep(2)} disabled={!account.firstName || !account.lastName || !account.email || !account.password || !account.confirmPassword}>
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Government Information</h2>
          <div><Label>Organization Name *</Label><Input value={gov.name} onChange={(e) => setGov({ ...gov, name: e.target.value })} /></div>
          <div>
            <Label>Government Type *</Label>
            <Select value={gov.type} onValueChange={(v) => setGov({ ...gov, type: v })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {GOV_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Assigned Region City</Label><Input value={gov.regionCity} onChange={(e) => setGov({ ...gov, regionCity: e.target.value })} /></div>
            <div><Label>Assigned Region State</Label><Input value={gov.regionState} onChange={(e) => setGov({ ...gov, regionState: e.target.value })} /></div>
          </div>
          <div><Label>Primary Contact Name</Label><Input value={gov.contactName} onChange={(e) => setGov({ ...gov, contactName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Primary Contact Email</Label><Input type="email" value={gov.contactEmail} onChange={(e) => setGov({ ...gov, contactEmail: e.target.value })} /></div>
            <div><Label>Primary Contact Phone</Label><Input type="tel" value={gov.contactPhone} onChange={(e) => setGov({ ...gov, contactPhone: e.target.value })} /></div>
          </div>
          <div><Label>Address</Label><Input value={gov.address} onChange={(e) => setGov({ ...gov, address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>City</Label><Input value={gov.city} onChange={(e) => setGov({ ...gov, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={gov.state} onChange={(e) => setGov({ ...gov, state: e.target.value })} /></div>
            <div><Label>ZIP</Label><Input value={gov.zip} onChange={(e) => setGov({ ...gov, zip: e.target.value })} /></div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading || !gov.name || !gov.type}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </div>
      )}
    </SignupShell>
  );
}
