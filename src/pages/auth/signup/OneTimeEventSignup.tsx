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

/** Lightweight signup for a single event (wedding, one-night event, grand opening). No full venue profile. */
export default function OneTimeEventSignup({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [a, setA] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [ev, setEv] = useState({ name: "", date: "", address: "", city: "", state: "", zip: "" });
  const today = new Date().toISOString().slice(0, 10);

  const submit = async () => {
    if (a.password !== a.confirmPassword) return toast.error("Passwords do not match");
    const pw = validatePassword(a.password);
    if (pw) return toast.error(pw);
    if (ev.date < today) return toast.error("Event date must be today or later");
    setLoading(true);
    try {
      const { data: v, error: vErr } = await supabase.functions.invoke("validate-signup", {
        body: { signup_type: "venue", account: { ...a }, org: { name: ev.name, type: "event" }, loc: { name: ev.name } },
      });
      if (vErr) throw vErr;
      if (v && !v.valid) { toast.error(v.errors?.join("; ") || "Validation failed"); setLoading(false); return; }
      const { data: auth, error: authErr } = await supabase.auth.signUp({
        email: a.email, password: a.password, options: { data: { first_name: a.firstName, last_name: a.lastName } },
      });
      if (authErr) throw authErr;
      if (!auth.session) throw new Error("An account with this email already exists.");
      const { data: r, error: fnErr } = await supabase.functions.invoke("complete-partner-signup", {
        body: { pathway: "one_time_event", account: { firstName: a.firstName, lastName: a.lastName, phone: a.phone }, event: ev },
      });
      if (fnErr) throw new Error((r as any)?.error || fnErr.message);
      if (r?.error) throw new Error(r.error);
      await supabase.auth.signOut();
      setStep(3);
    } catch (e: any) { toast.error(e.message || "Signup failed"); } finally { setLoading(false); }
  };

  if (step === 3) return <ConfirmationScreen message="Thanks! Your one-time event account is pending approval. Once approved, sign in to log your donation on your event date. The account becomes inactive a few days after the event." />;

  return (
    <SignupShell currentStep={step} totalSteps={2}>
      {step === 1 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold text-foreground">Your Event</h2>
          </div>
          <div><Label>Event name *</Label><Input value={ev.name} onChange={(e) => setEv({ ...ev, name: e.target.value })} placeholder="Smith–Lee wedding" /></div>
          <div><Label>Event date *</Label><Input type="date" min={today} value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} /></div>
          <div><Label>Street address *</Label><Input autoComplete="off" value={ev.address} onChange={(e) => setEv({ ...ev, address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>City *</Label><Input autoComplete="off" value={ev.city} onChange={(e) => setEv({ ...ev, city: e.target.value })} /></div>
            <div><Label>State *</Label><Input autoComplete="off" value={ev.state} onChange={(e) => setEv({ ...ev, state: e.target.value })} /></div>
            <div><Label>ZIP *</Label><Input autoComplete="off" value={ev.zip} onChange={(e) => setEv({ ...ev, zip: e.target.value })} /></div>
          </div>
          <Button className="w-full" onClick={() => setStep(2)} disabled={!ev.name || !ev.date || !ev.address || !ev.city || ev.state.length < 2 || ev.zip.length < 3}>Continue</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First name *</Label><Input value={a.firstName} onChange={(e) => setA({ ...a, firstName: e.target.value })} /></div>
            <div><Label>Last name *</Label><Input value={a.lastName} onChange={(e) => setA({ ...a, lastName: e.target.value })} /></div>
          </div>
          <div><Label>Email *</Label><Input type="email" autoComplete="off" value={a.email} onChange={(e) => setA({ ...a, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input type="tel" autoComplete="off" value={a.phone} onChange={(e) => setA({ ...a, phone: e.target.value })} /></div>
          <div><Label>Password *</Label><PasswordInput autoComplete="new-password" value={a.password} onChange={(e) => setA({ ...a, password: e.target.value })} /></div>
          <div><Label>Confirm password *</Label><PasswordInput autoComplete="new-password" value={a.confirmPassword} onChange={(e) => setA({ ...a, confirmPassword: e.target.value })} /></div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={submit} disabled={loading || !a.firstName || !a.lastName || !a.email || !a.password}>{loading ? "Submitting..." : "Create event account"}</Button>
          </div>
        </div>
      )}
    </SignupShell>
  );
}
