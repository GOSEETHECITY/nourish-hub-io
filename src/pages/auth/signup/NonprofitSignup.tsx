import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";
import SignupShell from "./SignupShell";
import ConfirmationScreen from "./ConfirmationScreen";

const FOOD_TYPES = [
  { value: "prepared_meals", label: "Prepared Meals / Cooked Food" },
  { value: "produce", label: "Produce / Fresh Fruits and Vegetables" },
  { value: "dairy", label: "Dairy" },
  { value: "meat_protein", label: "Meat / Protein" },
  { value: "baked_goods", label: "Baked Goods" },
  { value: "shelf_stable", label: "Shelf-Stable / Packaged / Non-Perishable" },
  { value: "frozen", label: "Frozen" },
];

const POPULATIONS = [
  "Children", "Seniors", "Families", "Homeless Individuals", "Veterans", "Low Income Individuals", "Other",
];

interface Props {
  onBack: () => void;
}

export default function NonprofitSignup({ onBack }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Account
  const [account, setAccount] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
  // Step 2 — Organization
  const [org, setOrg] = useState({ name: "", ein: "", website: "", socialHandles: "", contactName: "", contactEmail: "", contactPhone: "", address: "", city: "", state: "", zip: "", county: "", operatingHours: "" });
  // Step 3 — Capacity
  const [capacity, setCapacity] = useState({ coldStorage: false, refrigeration: false, cabinetry: false, foodTypes: [] as string[], weeklyServed: "", populations: [] as string[] });
  // Step 4 — Documents
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [agreementFile, setAgreementFile] = useState<File | null>(null);

  const toggleFoodType = (v: string) => {
    setCapacity((c) => ({
      ...c,
      foodTypes: c.foodTypes.includes(v) ? c.foodTypes.filter((t) => t !== v) : [...c.foodTypes, v],
    }));
  };

  const togglePopulation = (v: string) => {
    setCapacity((c) => ({
      ...c,
      populations: c.populations.includes(v) ? c.populations.filter((t) => t !== v) : [...c.populations, v],
    }));
  };

  const handleSubmit = async () => {
    if (account.password !== account.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (!insuranceFile || !agreementFile) { toast.error("Please upload both required documents"); return; }
    setLoading(true);
    try {
      // 1. Create user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: { data: { first_name: account.firstName, last_name: account.lastName } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");
      const userId = authData.user.id;

      // 2. Assign role
      await supabase.from("user_roles").insert({ user_id: userId, role: "nonprofit_partner" });

      // 3. Upload documents
      const insurancePath = `nonprofits/${userId}/insurance_${insuranceFile.name}`;
      const agreementPath = `nonprofits/${userId}/agreement_${agreementFile.name}`;

      const [insUpload, agrUpload] = await Promise.all([
        supabase.storage.from("nonprofit-documents").upload(insurancePath, insuranceFile),
        supabase.storage.from("nonprofit-documents").upload(agreementPath, agreementFile),
      ]);
      if (insUpload.error) throw insUpload.error;
      if (agrUpload.error) throw agrUpload.error;

      const insUrl = supabase.storage.from("nonprofit-documents").getPublicUrl(insurancePath).data.publicUrl;
      const agrUrl = supabase.storage.from("nonprofit-documents").getPublicUrl(agreementPath).data.publicUrl;

      // 4. Create nonprofit record
      let socialObj: Record<string, string> | null = null;
      if (org.socialHandles) {
        socialObj = { handles: org.socialHandles };
      }

      await supabase.from("nonprofits").insert({
        user_id: userId,
        organization_name: org.name,
        ein: org.ein || null,
        website: org.website || null,
        social_handles: socialObj,
        primary_contact: org.contactName || null,
        address: org.address || null,
        city: org.city || null,
        state: org.state || null,
        zip: org.zip || null,
        county: org.county || null,
        operating_hours: org.operatingHours || null,
        cold_storage: capacity.coldStorage,
        refrigeration: capacity.refrigeration,
        cabinetry: capacity.cabinetry,
        food_types_accepted: capacity.foodTypes.length ? capacity.foodTypes : null,
        estimated_weekly_served: capacity.weeklyServed ? parseInt(capacity.weeklyServed) : null,
        population_served: capacity.populations.length ? capacity.populations.join(", ") : null,
        proof_of_insurance_url: insUrl,
        signed_agreement_url: agrUrl,
        approval_status: "pending",
      });

      // 5. Update profile
      await supabase.from("profiles").update({
        first_name: account.firstName,
        last_name: account.lastName,
        phone: account.phone || null,
      }).eq("id", userId);

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
      <ConfirmationScreen message="Your nonprofit application has been submitted and is pending approval. We will notify you once your application has been reviewed. Thank you for applying to the HarietAI network." />
    );
  }

  return (
    <SignupShell currentStep={step} totalSteps={5}>
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
          <h2 className="text-lg font-semibold text-foreground">Organization Information</h2>
          <div><Label>Organization Name *</Label><Input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>EIN</Label><Input value={org.ein} onChange={(e) => setOrg({ ...org, ein: e.target.value })} placeholder="XX-XXXXXXX" /></div>
            <div><Label>Website</Label><Input value={org.website} onChange={(e) => setOrg({ ...org, website: e.target.value })} /></div>
          </div>
          <div><Label>Social Handles</Label><Input value={org.socialHandles} onChange={(e) => setOrg({ ...org, socialHandles: e.target.value })} placeholder="@handle" /></div>
          <div><Label>Primary Contact Name</Label><Input value={org.contactName} onChange={(e) => setOrg({ ...org, contactName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Primary Contact Email</Label><Input type="email" value={org.contactEmail} onChange={(e) => setOrg({ ...org, contactEmail: e.target.value })} /></div>
            <div><Label>Primary Contact Phone</Label><Input type="tel" value={org.contactPhone} onChange={(e) => setOrg({ ...org, contactPhone: e.target.value })} /></div>
          </div>
          <div><Label>Address</Label><Input value={org.address} onChange={(e) => setOrg({ ...org, address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>City</Label><Input value={org.city} onChange={(e) => setOrg({ ...org, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={org.state} onChange={(e) => setOrg({ ...org, state: e.target.value })} /></div>
            <div><Label>ZIP</Label><Input value={org.zip} onChange={(e) => setOrg({ ...org, zip: e.target.value })} /></div>
          </div>
          <div><Label>County</Label><Input value={org.county} onChange={(e) => setOrg({ ...org, county: e.target.value })} /></div>
          <div><Label>Operating Hours</Label><Input value={org.operatingHours} onChange={(e) => setOrg({ ...org, operatingHours: e.target.value })} /></div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={() => setStep(3)} disabled={!org.name}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Capacity Information</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <Checkbox checked={capacity.coldStorage} onCheckedChange={(c) => setCapacity({ ...capacity, coldStorage: !!c })} />
              <span className="text-sm text-foreground">Cold Storage Capacity</span>
            </label>
            <label className="flex items-center gap-3">
              <Checkbox checked={capacity.refrigeration} onCheckedChange={(c) => setCapacity({ ...capacity, refrigeration: !!c })} />
              <span className="text-sm text-foreground">Refrigeration Capacity</span>
            </label>
            <label className="flex items-center gap-3">
              <Checkbox checked={capacity.cabinetry} onCheckedChange={(c) => setCapacity({ ...capacity, cabinetry: !!c })} />
              <span className="text-sm text-foreground">Cabinetry Capacity</span>
            </label>
          </div>
          <div>
            <Label>Food Types Accepted</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {FOOD_TYPES.map((ft) => (
                <label key={ft.value} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={capacity.foodTypes.includes(ft.value)} onCheckedChange={() => toggleFoodType(ft.value)} />
                  {ft.label}
                </label>
              ))}
            </div>
          </div>
          <div><Label>Estimated Number Served Weekly</Label><Input type="number" value={capacity.weeklyServed} onChange={(e) => setCapacity({ ...capacity, weeklyServed: e.target.value })} /></div>
          <div>
            <Label>Population Served</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {POPULATIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={capacity.populations.includes(p)} onCheckedChange={() => togglePopulation(p)} />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
            <Button className="flex-1" onClick={() => setStep(4)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Document Uploads</h2>
          <p className="text-sm text-muted-foreground">Both documents are required to submit your application.</p>
          <div className="space-y-2">
            <Label>Proof of Insurance *</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{insuranceFile ? insuranceFile.name : "Choose file"}</span>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setInsuranceFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Signed Agreement *</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{agreementFile ? agreementFile.name : "Choose file"}</span>
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setAgreementFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Back</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading || !insuranceFile || !agreementFile}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </div>
      )}
    </SignupShell>
  );
}
