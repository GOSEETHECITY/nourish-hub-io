import { useState } from "react";
import { validatePassword } from "@/lib/validatePassword";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import SignupShell from "./SignupShell";
import ConfirmationScreen from "./ConfirmationScreen";
import {
  SignupPasswordFields,
  SignatureStep,
  DocumentsStep,
  uploadSignupDocuments,
  type SigState,
} from "./SignupSteps";

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
  const [gov, setGov] = useState({ name: "", type: "" });
  const [invitationCode, setInvitationCode] = useState("");
  const [sig, setSig] = useState<SigState>({ name: "", title: "", authorized: false, consent: false, templateId: null });
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [docExpiry, setDocExpiry] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    if (account.password !== account.confirmPassword) { toast.error("Passwords do not match"); return; }
    const pwError = validatePassword(account.password);
    if (pwError) { toast.error(pwError); return; }
    setLoading(true);
    try {
      const { data: valResult, error: valError } = await supabase.functions.invoke("validate-signup", {
        body: {
          signup_type: "government",
          account: { ...account },
          gov: { name: gov.name, type: gov.type },
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
      if (!authData.session) throw new Error("An account with this email already exists.");

      const documents = await uploadSignupDocuments(docFiles, docExpiry);

      // Role assignment (invitation gated) and all organization / profile
      // writes run server-side with the service role.
      const { data: result, error: fnError } = await supabase.functions.invoke("complete-partner-signup", {
        body: {
          pathway: "government",
          invitationCode: invitationCode.trim(),
          account: { firstName: account.firstName, lastName: account.lastName, phone: account.phone },
          org: { name: gov.name, type: gov.type },
          signature: { template_id: sig.templateId, signer_name: sig.name.trim(), signer_title: sig.title.trim() },
          documents,
        },
      });
      if (fnError) throw new Error((result as any)?.error || fnError.message);
      if (result?.error) throw new Error(result.error);

      await supabase.auth.signOut();
      setStep(5);
    } catch (e: any) { toast.error(e.message || "Signup failed"); } finally { setLoading(false); }
  };

  if (step === 5) return <ConfirmationScreen message="Your government account request has been submitted and is pending approval. We will email you once an admin has reviewed it." />;

  return (
    <SignupShell currentStep={step} totalSteps={4}>
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold text-foreground">Your Account</h2>
          </div>
          <div><Label>Invitation Code *</Label><Input value={invitationCode} onChange={(e) => setInvitationCode(e.target.value)} placeholder="Enter your government invitation code" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name *</Label><Input value={account.firstName} onChange={(e) => setAccount({ ...account, firstName: e.target.value })} /></div>
            <div><Label>Last Name *</Label><Input value={account.lastName} onChange={(e) => setAccount({ ...account, lastName: e.target.value })} /></div>
          </div>
          <div><Label>Email *</Label><Input type="email" autoComplete="off" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input type="tel" autoComplete="off" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} /></div>
          <SignupPasswordFields
            password={account.password}
            confirmPassword={account.confirmPassword}
            onPasswordChange={(v) => setAccount({ ...account, password: v })}
            onConfirmChange={(v) => setAccount({ ...account, confirmPassword: v })}
          />
          <Button className="w-full" onClick={() => setStep(2)} disabled={!invitationCode.trim() || !account.firstName || !account.lastName || !account.email || !account.password || !account.confirmPassword}>Continue</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your Entity</h2>
          <div><Label>Entity Name *</Label><Input value={gov.name} onChange={(e) => setGov({ ...gov, name: e.target.value })} /></div>
          <div>
            <Label>Organization Type *</Label>
            <Select value={gov.type} onValueChange={(v) => setGov({ ...gov, type: v })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{GOV_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={() => setStep(3)} disabled={!gov.name || !gov.type}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <SignatureStep pathway="government" sig={sig} setSig={setSig} onBack={() => setStep(2)} onContinue={() => setStep(4)} />
      )}

      {step === 4 && (
        <>
          <DocumentsStep files={docFiles} setFiles={setDocFiles} expiry={docExpiry} setExpiry={setDocExpiry} required={false} onBack={() => setStep(3)} onContinue={handleSubmit} />
          {loading && <p className="text-sm text-muted-foreground text-center">Submitting your application…</p>}
        </>
      )}
    </SignupShell>
  );
}
