import { useState } from "react";
import { validatePassword } from "@/lib/validatePassword";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, X, Plus } from "lucide-react";
import PasswordInput from "@/components/ui/password-input";
import SignupShell from "./SignupShell";
import ConfirmationScreen from "./ConfirmationScreen";
import { US_STATES } from "@/lib/constants";

const GOV_TYPES = [
  { value: "municipal_government", label: "Municipal Government" },
  { value: "county_government", label: "County Government" },
  { value: "state_government", label: "State Government" },
];

interface Props { onBack: () => void; }

export default function GovernmentSignup({ onBack }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [account, setAccount] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [gov, setGov] = useState({ name: "", type: "", contactName: "", contactEmail: "", contactPhone: "", address: "", city: "", state: "", zip: "", county: "" });
  const [invitationCode, setInvitationCode] = useState("");

  // Region selection
  const [regionState, setRegionState] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [regions, setRegions] = useState<string[]>([]);

  const addRegion = () => {
    const val = regionInput.trim();
    if (val && !regions.includes(val)) { setRegions([...regions, val]); setRegionInput(""); }
  };

  const removeRegion = (r: string) => setRegions(regions.filter((x) => x !== r));

  const handleSubmit = async () => {
    if (account.password !== account.confirmPassword) { toast.error("Passwords do not match"); return; }
    const pwError = validatePassword(account.password);
    if (pwError) { toast.error(pwError); return; }
    setLoading(true);
    try {
      const { data: valResult, error: valError } = await supabase.functions.invoke("validate-signup", {
        body: {
          signup_type: "government",
          account: { firstName: account.firstName, lastName: account.lastName, email: account.email, phone: account.phone, password: account.password, confirmPassword: account.confirmPassword },
          gov: { name: gov.name, type: gov.type, contactEmail: gov.contactEmail, contactPhone: gov.contactPhone },
        },
      });
      if (valError) throw valError;
      if (valResult && !valResult.valid) { toast.error(valResult.errors?.join("; ") || "Validation failed"); setLoading(false); return; }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: account.email, password: account.password,
        options: { data: { first_name: account.firstName, last_name: account.lastName } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");
      const userId = authData.user.id;

      // Assign government_partner role via server-side function (not self-assignable via RLS)
      const { data: roleResult, error: roleError } = await supabase.functions.invoke("assign-government-role", {
        body: { invitationCode },
      });
      if (roleError) throw roleError;
      if (roleResult && roleResult.error) throw new Error(roleResult.error);

      // Build government_regions JSONB
      const governmentRegions = {
        state: regionState || gov.state || null,
        cities: gov.type === "municipal_government" ? regions : [],
        counties: gov.type === "county_government" ? regions : [],
        is_state_wide: gov.type === "state_government",
      };

      const { data: orgData, error: orgError } = await supabase.from("organizations").insert({
        name: gov.name, type: "government_entity" as any,
        primary_contact_name: gov.contactName || null, primary_contact_email: gov.contactEmail || null,
        primary_contact_phone: gov.contactPhone || null,
        address: gov.address || null, city: gov.city || null, state: gov.state || null,
        zip: gov.zip || null, county: gov.county || null, approval_status: "pending",
        government_regions: governmentRegions,
      }).select().single();
      if (orgError) throw orgError;

      await supabase.from("profiles").update({
        first_name: account.firstName, last_name: account.lastName, phone: account.phone || null, organization_id: orgData.id,
      }).eq("id", userId);

      await supabase.auth.signOut();
      setStep(3);
    } catch (e: any) { toast.error(e.message || "Signup failed"); } finally { setLoading(false); }
  };

  if (step === 3) return <ConfirmationScreen message="Your government account request has been submitted and is pending approval. We will notify you once your account has been reviewed." />;

  return (
    <SignupShell currentStep={step} totalSteps={3}>
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
          <Button className="w-full" onClick={() => setStep(2)} disabled={!account.firstName || !account.lastName || !account.email || !account.password || !account.confirmPassword}>Continue</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Government Info</h2>
          <div><Label>Organization Name *</Label><Input value={gov.name} onChange={(e) => setGov({ ...gov, name: e.target.value })} /></div>
          <div>
            <Label>Government Type *</Label>
            <Select value={gov.type} onValueChange={(v) => { setGov({ ...gov, type: v }); setRegions([]); }}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{GOV_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {/* Region Selection */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Assigned Region</p>
            <div>
              <Label>State *</Label>
              <Select value={regionState || gov.state} onValueChange={(v) => { setRegionState(v); setGov({ ...gov, state: v }); }}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {gov.type === "state_government" && (
              <p className="text-xs text-muted-foreground">As a state government, your dashboard will show data for the entire selected state.</p>
            )}
            {gov.type === "municipal_government" && (
              <div>
                <Label>Cities in your jurisdiction</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={regionInput} onChange={(e) => setRegionInput(e.target.value)} placeholder="Type city name" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRegion(); } }} />
                  <Button type="button" size="sm" onClick={addRegion} disabled={!regionInput.trim()}><Plus className="w-4 h-4" /></Button>
                </div>
                {regions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {regions.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full">
                        {r}<button onClick={() => removeRegion(r)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {gov.type === "county_government" && (
              <div>
                <Label>Counties in your jurisdiction</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={regionInput} onChange={(e) => setRegionInput(e.target.value)} placeholder="Type county name" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRegion(); } }} />
                  <Button type="button" size="sm" onClick={addRegion} disabled={!regionInput.trim()}><Plus className="w-4 h-4" /></Button>
                </div>
                {regions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {regions.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full">
                        {r}<button onClick={() => removeRegion(r)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div><Label>Primary Contact Name</Label><Input value={gov.contactName} onChange={(e) => setGov({ ...gov, contactName: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Primary Contact Email</Label><Input type="email" value={gov.contactEmail} onChange={(e) => setGov({ ...gov, contactEmail: e.target.value })} /></div>
            <div><Label>Primary Contact Phone</Label><Input type="tel" value={gov.contactPhone} onChange={(e) => setGov({ ...gov, contactPhone: e.target.value })} /></div>
          </div>
          <div><Label>Address</Label><Input value={gov.address} onChange={(e) => setGov({ ...gov, address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>City</Label><Input value={gov.city} onChange={(e) => setGov({ ...gov, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={gov.state} disabled className="bg-muted" /></div>
            <div><Label>ZIP</Label><Input value={gov.zip} onChange={(e) => setGov({ ...gov, zip: e.target.value })} /></div>
          </div>
          <div><Label>County</Label><Input value={gov.county} onChange={(e) => setGov({ ...gov, county: e.target.value })} /></div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading || !gov.name || !gov.type || !(regionState || gov.state)}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </div>
      )}
    </SignupShell>
  );
}
