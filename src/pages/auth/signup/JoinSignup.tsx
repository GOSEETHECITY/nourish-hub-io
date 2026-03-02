import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import PasswordInput from "@/components/ui/password-input";
import SignupShell from "./SignupShell";
import ConfirmationScreen from "./ConfirmationScreen";
import SustainabilityBaselineForm, { emptySustainabilityBaseline, type SustainabilityBaselineData } from "@/components/forms/SustainabilityBaselineForm";

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

type JoinType = "venue" | "nonprofit" | null;

interface OrgMatch {
  id: string;
  name: string;
  type: JoinType;
}

export default function JoinSignup({ onBack }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [validating, setValidating] = useState(false);
  const [orgMatch, setOrgMatch] = useState<OrgMatch | null>(null);

  // Account
  const [account, setAccount] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });

  // Venue location
  const [venueLoc, setVenueLoc] = useState({
    name: "", address: "", city: "", state: "", zip: "", county: "",
    pickupAddress: "", pickupInstructions: "", hours: "", surplusFrequency: "",
    contactName: "", contactEmail: "", contactPhone: "",
  });

  // Nonprofit location
  const [npLoc, setNpLoc] = useState({
    name: "", address: "", city: "", state: "", zip: "", county: "",
    operatingHours: "", pickupDropoff: "",
    contactName: "", contactEmail: "", contactPhone: "",
  });

  // Sustainability baseline (for venue)
  const [baseline, setBaseline] = useState<SustainabilityBaselineData>(emptySustainabilityBaseline);

  // Capacity (for nonprofit)
  const [capacity, setCapacity] = useState({
    coldStorage: false, refrigeration: false, cabinetry: false,
    foodTypes: [] as string[], weeklyServed: "", populations: [] as string[],
  });

  const toggleFoodType = (v: string) => {
    setCapacity((c) => ({ ...c, foodTypes: c.foodTypes.includes(v) ? c.foodTypes.filter((t) => t !== v) : [...c.foodTypes, v] }));
  };
  const togglePopulation = (v: string) => {
    setCapacity((c) => ({ ...c, populations: c.populations.includes(v) ? c.populations.filter((t) => t !== v) : [...c.populations, v] }));
  };

  const validateCode = async () => {
    if (!joinCode.trim()) return;
    setValidating(true);
    setCodeError("");
    setOrgMatch(null);
    try {
      const { data, error } = await supabase.rpc("validate_join_code", { p_code: joinCode.trim().toUpperCase() });
      if (error) throw error;
      if (!data) {
        setCodeError("This code is not recognized. Please check with your organization for the correct code.");
        return;
      }
      setOrgMatch(data as OrgMatch);
    } catch (e: any) {
      setCodeError(e.message || "Failed to validate code");
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (account.password !== account.confirmPassword) { toast.error("Passwords do not match"); return; }
    if (account.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (!orgMatch) return;
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

      if (orgMatch.type === "venue") {
        await supabase.from("user_roles").insert({ user_id: userId, role: "venue_partner" });

        const { data: locData, error: locError } = await supabase.from("locations").insert({
          organization_id: orgMatch.id,
          name: venueLoc.name,
          address: venueLoc.address || null,
          city: venueLoc.city || null,
          state: venueLoc.state || null,
          zip: venueLoc.zip || null,
          county: venueLoc.county || null,
          pickup_address: venueLoc.pickupAddress || venueLoc.address || null,
          pickup_instructions: venueLoc.pickupInstructions || null,
          hours_of_operation: venueLoc.hours || null,
          estimated_surplus_frequency: venueLoc.surplusFrequency || null,
          contact_name: venueLoc.contactName || null,
          contact_email: venueLoc.contactEmail || null,
          contact_phone: venueLoc.contactPhone || null,
          approval_status: "pending",
        }).select().single();
        if (locError) throw locError;

        const outcomes = [...baseline.priority_outcomes];
        if (baseline.priority_other && outcomes.includes("Other")) {
          outcomes[outcomes.indexOf("Other")] = baseline.priority_other;
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

        await supabase.from("profiles").update({
          first_name: account.firstName,
          last_name: account.lastName,
          phone: account.phone || null,
          organization_id: orgMatch.id,
          location_id: locData.id,
        }).eq("id", userId);
      } else {
        // Nonprofit join
        await supabase.from("user_roles").insert({ user_id: userId, role: "nonprofit_partner" });

        await supabase.from("nonprofit_locations").insert({
          nonprofit_id: orgMatch.id,
          name: npLoc.name,
          address: npLoc.address || null,
          city: npLoc.city || null,
          state: npLoc.state || null,
          zip: npLoc.zip || null,
          county: npLoc.county || null,
          operating_hours: npLoc.operatingHours || null,
          pickup_dropoff_instructions: npLoc.pickupDropoff || null,
          contact_name: npLoc.contactName || null,
          contact_email: npLoc.contactEmail || null,
          contact_phone: npLoc.contactPhone || null,
          cold_storage: capacity.coldStorage,
          refrigeration: capacity.refrigeration,
          cabinetry: capacity.cabinetry,
          food_types_accepted: capacity.foodTypes.length ? capacity.foodTypes : null,
          estimated_weekly_served: capacity.weeklyServed ? parseInt(capacity.weeklyServed) : null,
          population_served: capacity.populations.length ? capacity.populations.join(", ") : null,
          approval_status: "pending",
        });

        await supabase.from("profiles").update({
          first_name: account.firstName,
          last_name: account.lastName,
          phone: account.phone || null,
          nonprofit_id: orgMatch.id,
        }).eq("id", userId);
      }

      await supabase.auth.signOut();
      setStep(5);
    } catch (e: any) {
      toast.error(e.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === 5) {
    const msg = orgMatch?.type === "venue"
      ? `Your location has been submitted and is pending approval. We will notify you once your location has been reviewed. Thank you for joining ${orgMatch?.name}.`
      : `Your distribution location has been submitted and is pending approval. We will notify you once your location has been reviewed. Thank you for joining ${orgMatch?.name}.`;
    return <ConfirmationScreen message={msg} />;
  }

  return (
    <SignupShell currentStep={step} totalSteps={5}>
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold text-foreground">Enter Your Join Code</h2>
          </div>
          <p className="text-sm text-muted-foreground">Enter the Location Join Code provided by your organization.</p>
          <div>
            <Label>Join Code *</Label>
            <Input
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setCodeError(""); setOrgMatch(null); }}
              placeholder="e.g. HAR-XXXX or NP-XXXX"
              className="font-mono tracking-widest text-center text-lg"
            />
          </div>
          {codeError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {codeError}
            </div>
          )}
          {orgMatch && (
            <div className="flex items-center gap-2 bg-success/10 text-success rounded-lg p-3 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Organization found: <strong>{orgMatch.name}</strong></span>
            </div>
          )}
          {!orgMatch ? (
            <Button className="w-full" onClick={validateCode} disabled={!joinCode.trim() || validating}>
              {validating ? "Validating..." : "Validate Code"}
            </Button>
          ) : (
            <Button className="w-full" onClick={() => setStep(2)}>
              Continue
            </Button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your Account</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name *</Label><Input value={account.firstName} onChange={(e) => setAccount({ ...account, firstName: e.target.value })} /></div>
            <div><Label>Last Name *</Label><Input value={account.lastName} onChange={(e) => setAccount({ ...account, lastName: e.target.value })} /></div>
          </div>
          <div><Label>Email *</Label><Input type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input type="tel" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} /></div>
          <div><Label>Password *</Label><PasswordInput value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} placeholder="••••••••" /></div>
          <div><Label>Confirm Password *</Label><PasswordInput value={account.confirmPassword} onChange={(e) => setAccount({ ...account, confirmPassword: e.target.value })} placeholder="••••••••" /></div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={() => setStep(3)} disabled={!account.firstName || !account.lastName || !account.email || !account.password || !account.confirmPassword}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && orgMatch?.type === "venue" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your Location</h2>
          <div><Label>Location Name *</Label><Input value={venueLoc.name} onChange={(e) => setVenueLoc({ ...venueLoc, name: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={venueLoc.address} onChange={(e) => setVenueLoc({ ...venueLoc, address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>City</Label><Input value={venueLoc.city} onChange={(e) => setVenueLoc({ ...venueLoc, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={venueLoc.state} onChange={(e) => setVenueLoc({ ...venueLoc, state: e.target.value })} /></div>
            <div><Label>ZIP</Label><Input value={venueLoc.zip} onChange={(e) => setVenueLoc({ ...venueLoc, zip: e.target.value })} /></div>
          </div>
          <div><Label>County</Label><Input value={venueLoc.county} onChange={(e) => setVenueLoc({ ...venueLoc, county: e.target.value })} /></div>
          <div><Label>Pickup Address</Label><Input value={venueLoc.pickupAddress} onChange={(e) => setVenueLoc({ ...venueLoc, pickupAddress: e.target.value })} placeholder="Defaults to location address" /></div>
          <div><Label>Pickup Instructions</Label><Input value={venueLoc.pickupInstructions} onChange={(e) => setVenueLoc({ ...venueLoc, pickupInstructions: e.target.value })} /></div>
          <div><Label>Hours of Operation</Label><Input value={venueLoc.hours} onChange={(e) => setVenueLoc({ ...venueLoc, hours: e.target.value })} /></div>
          <div><Label>Estimated Surplus Frequency</Label><Input value={venueLoc.surplusFrequency} onChange={(e) => setVenueLoc({ ...venueLoc, surplusFrequency: e.target.value })} /></div>
          <div><Label>Location Contact Person Name</Label><Input value={venueLoc.contactName} onChange={(e) => setVenueLoc({ ...venueLoc, contactName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Contact Email</Label><Input type="email" value={venueLoc.contactEmail} onChange={(e) => setVenueLoc({ ...venueLoc, contactEmail: e.target.value })} /></div>
            <div><Label>Contact Phone</Label><Input type="tel" value={venueLoc.contactPhone} onChange={(e) => setVenueLoc({ ...venueLoc, contactPhone: e.target.value })} /></div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
            <Button className="flex-1" onClick={() => setStep(4)} disabled={!venueLoc.name}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && orgMatch?.type === "nonprofit" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your Distribution Location</h2>
          <div><Label>Location Name *</Label><Input value={npLoc.name} onChange={(e) => setNpLoc({ ...npLoc, name: e.target.value })} placeholder="e.g. Northside Food Pantry" /></div>
          <div><Label>Address</Label><Input value={npLoc.address} onChange={(e) => setNpLoc({ ...npLoc, address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>City</Label><Input value={npLoc.city} onChange={(e) => setNpLoc({ ...npLoc, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={npLoc.state} onChange={(e) => setNpLoc({ ...npLoc, state: e.target.value })} /></div>
            <div><Label>ZIP</Label><Input value={npLoc.zip} onChange={(e) => setNpLoc({ ...npLoc, zip: e.target.value })} /></div>
          </div>
          <div><Label>County</Label><Input value={npLoc.county} onChange={(e) => setNpLoc({ ...npLoc, county: e.target.value })} /></div>
          <div><Label>Operating Hours</Label><Input value={npLoc.operatingHours} onChange={(e) => setNpLoc({ ...npLoc, operatingHours: e.target.value })} /></div>
          <div><Label>Pickup / Dropoff Instructions</Label><Input value={npLoc.pickupDropoff} onChange={(e) => setNpLoc({ ...npLoc, pickupDropoff: e.target.value })} /></div>
          <div><Label>Location Contact Person Name</Label><Input value={npLoc.contactName} onChange={(e) => setNpLoc({ ...npLoc, contactName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Contact Email</Label><Input type="email" value={npLoc.contactEmail} onChange={(e) => setNpLoc({ ...npLoc, contactEmail: e.target.value })} /></div>
            <div><Label>Contact Phone</Label><Input type="tel" value={npLoc.contactPhone} onChange={(e) => setNpLoc({ ...npLoc, contactPhone: e.target.value })} /></div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
            <Button className="flex-1" onClick={() => setStep(4)} disabled={!npLoc.name}>Continue</Button>
          </div>
        </div>
      )}

      {step === 4 && orgMatch?.type === "venue" && (
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

      {step === 4 && orgMatch?.type === "nonprofit" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Capacity Info</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Cold Storage Capacity</span>
              <Switch checked={capacity.coldStorage} onCheckedChange={(c) => setCapacity({ ...capacity, coldStorage: c })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Refrigeration Capacity</span>
              <Switch checked={capacity.refrigeration} onCheckedChange={(c) => setCapacity({ ...capacity, refrigeration: c })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Cabinetry Capacity</span>
              <Switch checked={capacity.cabinetry} onCheckedChange={(c) => setCapacity({ ...capacity, cabinetry: c })} />
            </div>
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
