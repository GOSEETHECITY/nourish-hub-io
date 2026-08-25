import { useState } from "react";
import { validatePassword } from "@/lib/validatePassword";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import PasswordInput from "@/components/ui/password-input";
import SignupShell from "./SignupShell";
import ConfirmationScreen from "./ConfirmationScreen";

interface Props {
  onBack: () => void;
}

export default function NonprofitSignup({ onBack }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [account, setAccount] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [org, setOrg] = useState({ name: "" });

  const handleSubmit = async () => {
    if (account.password !== account.confirmPassword) { toast.error("Passwords do not match"); return; }
    const pwError = validatePassword(account.password);
    if (pwError) { toast.error(pwError); return; }
    setLoading(true);
    try {
      const { data: valResult, error: valError } = await supabase.functions.invoke("validate-signup", {
        body: {
          signup_type: "nonprofit",
          account: { ...account },
          org: { name: org.name },
          loc: { name: org.name },
        },
      });
      if (valError) throw valError;
      if (valResult && !valResult.valid) {
        toast.error(valResult.errors?.join("; ") || valResult.error || "Validation failed");
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
      if (!authData.session) throw new Error("An account with this email already exists.");

      const { data: result, error: fnError } = await supabase.functions.invoke("complete-partner-signup", {
        body: {
          pathway: "nonprofit",
          account: { firstName: account.firstName, lastName: account.lastName, phone: account.phone },
          org: { name: org.name },
        },
      });
      if (fnError) throw new Error((result as any)?.error || fnError.message);
      if (result?.error) throw new Error(result.error);

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
      <ConfirmationScreen message="Your nonprofit application has been submitted and is pending approval. We will email you once an admin has reviewed it, and you can sign in as soon as you are approved." />
    );
  }

  return (
    <SignupShell currentStep={step} totalSteps={2}>
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
          <div><Label>Email *</Label><Input type="email" autoComplete="off" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input type="tel" autoComplete="off" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} /></div>
          <div><Label>Password *</Label><PasswordInput autoComplete="new-password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} placeholder="••••••••" /></div>
          <div><Label>Confirm Password *</Label><PasswordInput autoComplete="new-password" value={account.confirmPassword} onChange={(e) => setAccount({ ...account, confirmPassword: e.target.value })} placeholder="••••••••" /></div>
          <Button className="w-full" onClick={() => setStep(2)} disabled={!account.firstName || !account.lastName || !account.email || !account.password || !account.confirmPassword}>
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your Organization</h2>
          <div><Label>Organization Name *</Label><Input value={org.name} onChange={(e) => setOrg({ name: e.target.value })} /></div>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            EIN, facility details, distribution locations and your documents are collected once your application is approved.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading || !org.name}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </div>
      )}
    </SignupShell>
  );
}
