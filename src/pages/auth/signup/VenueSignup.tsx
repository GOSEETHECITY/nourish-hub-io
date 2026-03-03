import { useState } from "react";
import { validatePassword } from "@/lib/validatePassword";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import PasswordInput from "@/components/ui/password-input";
import type { OrgCategory } from "../Signup";
import SignupShell from "./SignupShell";
import ConfirmationScreen from "./ConfirmationScreen";
import SustainabilityBaselineForm, { emptySustainabilityBaseline, type SustainabilityBaselineData } from "@/components/forms/SustainabilityBaselineForm";

const ORG_TYPE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  restaurant: [
    { value: "restaurant", label: "Restaurant" },
    { value: "food_truck", label: "Food Truck" },
    { value: "catering_company", label: "Catering Company" },
    { value: "cafe", label: "Cafe" },
  ],
  hospitality: [
    { value: "hotel", label: "Hotel" },
    { value: "resort", label: "Resort" },
  ],
  venue_events: [
    { value: "convention_center", label: "Convention Center" },
    { value: "stadium", label: "Stadium" },
    { value: "arena", label: "Arena" },
    { value: "festival", label: "Festival" },
    { value: "airport", label: "Airport" },
  ],
  farm_grocery: [
    { value: "farm", label: "Farm" },
    { value: "grocery_store", label: "Grocery Store" },
  ],
};

function generateJoinCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `HAR-${code}`;
}

interface Props {
  category: OrgCategory;
  onBack: () => void;
}

export default function VenueSignup({ category, onBack }: Props) {
  const isIndependent = category === "restaurant";
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [account, setAccount] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [org, setOrg] = useState({ name: "", type: "", address: "", city: "", state: "", zip: "", county: "", contactName: "", contactEmail: "", contactPhone: "", billingContact: "" });
  const [loc, setLoc] = useState({ name: "", address: "", city: "", state: "", zip: "", county: "", pickupAddress: "", pickupInstructions: "", hours: "", surplusFrequency: "" });
  const [baseline, setBaseline] = useState<SustainabilityBaselineData>(emptySustainabilityBaseline);

  const typeOptions = ORG_TYPE_OPTIONS[category] || [];

  const handleSubmit = async () => {
    if (account.password !== account.confirmPassword) { toast.error("Passwords do not match"); return; }
    const pwError = validatePassword(account.password);
    if (pwError) { toast.error(pwError); return; }
    setLoading(true);
    try {
      // Server-side validation
      const { data: valResult, error: valError } = await supabase.functions.invoke("validate-signup", {
        body: {
          signup_type: "venue",
          account: { firstName: account.firstName, lastName: account.lastName, email: account.email, phone: account.phone, password: account.password, confirmPassword: account.confirmPassword },
          org: { name: org.name, type: org.type, contactEmail: org.contactEmail, contactPhone: org.contactPhone },
          loc: { name: loc.name },
        },
      });
      if (valError) throw valError;
      if (valResult && !valResult.valid) {
        const msgs = valResult.errors?.join("; ") || valResult.error || "Validation failed";
        toast.error(msgs);
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: { data: { first_name: account.firstName, last_name: account.lastName } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");
      const userId = authData.user.id;

      await supabase.from("user_roles").insert({ user_id: userId, role: "venue_partner" });

      const joinCode = isIndependent ? null : generateJoinCode();

      const { data: orgData, error: orgError } = await supabase.from("organizations").insert({
        name: org.name,
        type: org.type as any,
        primary_contact_name: org.contactName || null,
        primary_contact_email: org.contactEmail || null,
        primary_contact_phone: org.contactPhone || null,
        billing_contact: org.billingContact || null,
        address: org.address || null,
        city: org.city || null,
        state: org.state || null,
        zip: org.zip || null,
        county: org.county || null,
        approval_status: "pending",
        join_code: joinCode,
      }).select().single();
      if (orgError) throw orgError;

      await supabase.from("profiles").update({
        first_name: account.firstName,
        last_name: account.lastName,
        phone: account.phone || null,
        organization_id: orgData.id,
      }).eq("id", userId);

      const { data: locData, error: locError } = await supabase.from("locations").insert({
        organization_id: orgData.id,
        name: loc.name,
        address: loc.address || null,
        city: loc.city || null,
        state: loc.state || null,
        zip: loc.zip || null,
        county: loc.county || null,
        pickup_address: loc.pickupAddress || loc.address || null,
        pickup_instructions: loc.pickupInstructions || null,
        hours_of_operation: loc.hours || null,
        estimated_surplus_frequency: loc.surplusFrequency || null,
      }).select().single();
      if (locError) throw locError;

      const outcomes = [...baseline.priority_outcomes];
      if (baseline.priority_other && outcomes.includes("Other")) {
        const idx = outcomes.indexOf("Other");
        outcomes[idx] = baseline.priority_other;
      }
      await supabase.from("sustainability_baseline").insert({
        location_id: locData.id,
        generates_surplus: baseline.generates_surplus,
        estimated_daily_surplus: baseline.estimated_daily_surplus || null,
        surplus_types: baseline.surplus_types.length ? baseline.surplus_types : null,
        current_handling: baseline.current_handling || null,
        donation_frequency: baseline.donation_frequency || null,
        priority_outcomes: outcomes.length ? outcomes : null,
      });

      await supabase.auth.signOut();
      setStep(5);
    } catch (e: any) {
      toast.error(e.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === 5) {
    return (
      <ConfirmationScreen
        message={
          isIndependent
            ? "Your account has been submitted and is pending approval. We will notify you once your account has been reviewed. Thank you for joining the HarietAI network."
            : "Your organization has been submitted and is pending approval. We will notify you once your account has been reviewed. Thank you for joining the HarietAI network."
        }
      />
    );
  }

  return (
    <SignupShell currentStep={step} totalSteps={5}>
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold text-foreground">Your Account</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name *</Label><Input value={account.firstName} onChange={(e) => setAccount({ ...account, firstName: e.target.value })} /></div>
            <div><Label>Last Name *</Label><Input value={account.lastName} onChange={(e) => setAccount({ ...account, lastName: e.target.value })} /></div>
          </div>
          <div><Label>Email *</Label><Input type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input type="tel" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} /></div>
          <div><Label>Password *</Label><PasswordInput value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} placeholder="••••••••" /></div>
          <div><Label>Confirm Password *</Label><PasswordInput value={account.confirmPassword} onChange={(e) => setAccount({ ...account, confirmPassword: e.target.value })} placeholder="••••••••" /></div>
          <Button className="w-full" onClick={() => setStep(2)} disabled={!account.firstName || !account.lastName || !account.email || !account.password || !account.confirmPassword}>
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{isIndependent ? "Your Business" : "Organization Info"}</h2>
          <div><Label>{isIndependent ? "Business Name *" : "Organization Name *"}</Label><Input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} /></div>
          <div>
            <Label>{isIndependent ? "Business Type *" : "Organization Type *"}</Label>
            <Select value={org.type} onValueChange={(v) => setOrg({ ...org, type: v })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {typeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Address</Label><Input value={org.address} onChange={(e) => setOrg({ ...org, address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>City</Label><Input value={org.city} onChange={(e) => setOrg({ ...org, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={org.state} onChange={(e) => setOrg({ ...org, state: e.target.value })} /></div>
            <div><Label>ZIP</Label><Input value={org.zip} onChange={(e) => setOrg({ ...org, zip: e.target.value })} /></div>
          </div>
          <div><Label>County</Label><Input value={org.county} onChange={(e) => setOrg({ ...org, county: e.target.value })} /></div>
          <div><Label>Primary Contact Name</Label><Input value={org.contactName} onChange={(e) => setOrg({ ...org, contactName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Primary Contact Email</Label><Input type="email" value={org.contactEmail} onChange={(e) => setOrg({ ...org, contactEmail: e.target.value })} /></div>
            <div><Label>Primary Contact Phone</Label><Input type="tel" value={org.contactPhone} onChange={(e) => setOrg({ ...org, contactPhone: e.target.value })} /></div>
          </div>
          <div><Label>Billing Contact</Label><Input value={org.billingContact} onChange={(e) => setOrg({ ...org, billingContact: e.target.value })} /></div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={() => {
              if (!isIndependent) {
                setLoc((l) => ({ ...l, address: l.address || org.address, city: l.city || org.city, state: l.state || org.state, zip: l.zip || org.zip, county: l.county || org.county }));
              }
              setStep(3);
            }} disabled={!org.name || !org.type}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{isIndependent ? "Your Location" : "First Location"}</h2>
          <div><Label>Location Name *</Label><Input value={loc.name} onChange={(e) => setLoc({ ...loc, name: e.target.value })} placeholder="e.g. Main Kitchen" /></div>
          <div><Label>Address</Label><Input value={loc.address} onChange={(e) => setLoc({ ...loc, address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>City</Label><Input value={loc.city} onChange={(e) => setLoc({ ...loc, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={loc.state} onChange={(e) => setLoc({ ...loc, state: e.target.value })} /></div>
            <div><Label>ZIP</Label><Input value={loc.zip} onChange={(e) => setLoc({ ...loc, zip: e.target.value })} /></div>
          </div>
          <div><Label>County</Label><Input value={loc.county} onChange={(e) => setLoc({ ...loc, county: e.target.value })} /></div>
          <div><Label>Pickup Address</Label><Input value={loc.pickupAddress} onChange={(e) => setLoc({ ...loc, pickupAddress: e.target.value })} placeholder="Defaults to location address" /></div>
          <div><Label>Pickup Instructions</Label><Input value={loc.pickupInstructions} onChange={(e) => setLoc({ ...loc, pickupInstructions: e.target.value })} /></div>
          <div><Label>Hours of Operation</Label><Input value={loc.hours} onChange={(e) => setLoc({ ...loc, hours: e.target.value })} /></div>
          <div><Label>Estimated Surplus Frequency</Label><Input value={loc.surplusFrequency} onChange={(e) => setLoc({ ...loc, surplusFrequency: e.target.value })} /></div>
          {!isIndependent && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              You can add more locations after your account is approved using your Location Join Code.
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
            <Button className="flex-1" onClick={() => setStep(4)} disabled={!loc.name}>Continue</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Sustainability Baseline</h2>
          <p className="text-sm text-muted-foreground">Help us understand your current surplus situation.</p>
          <SustainabilityBaselineForm data={baseline} onChange={setBaseline} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Back</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </div>
      )}
    </SignupShell>
  );
}
