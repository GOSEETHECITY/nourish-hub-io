import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validatePassword } from "@/lib/validatePassword";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileText, Loader2, ShieldCheck } from "lucide-react";
import PasswordInput from "@/components/ui/password-input";

/** Maps a signup pathway to the agreement template kind. */
export function templateKindFor(pathway: "venue" | "nonprofit" | "government" | "one_time_event"): string {
  if (pathway === "nonprofit") return "nonprofit";
  if (pathway === "one_time_event") return "one_time_event";
  return "venue";
}

export type AgreementTemplate = { id: string; title: string; body: string; version: number };

/** Fetches the current standard agreement template (publicly readable). */
export async function fetchAgreementTemplate(pathway: "venue" | "nonprofit" | "government" | "one_time_event"): Promise<AgreementTemplate | null> {
  const { data, error } = await supabase
    .from("agreement_templates")
    .select("id, title, body, version")
    .eq("org_kind", templateKindFor(pathway))
    .is("organization_id", null)
    .is("nonprofit_id", null)
    .eq("is_current", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type EinResult = { status: "verified" | "needs_help"; reason: string; irs_name: string | null } | null;

/** Calls the server-side EIN check (ProPublica/IRS records). */
export async function verifyEin(ein: string): Promise<NonNullable<EinResult>> {
  const { data, error } = await supabase.functions.invoke("signup-support", {
    body: { action: "verify_ein", ein },
  });
  if (error) throw new Error("Could not verify the EIN. Please try again.");
  if (data?.error) throw new Error(data.error);
  return { status: data.ein_status, reason: data.reason, irs_name: data.irs_name ?? null };
}

export type SignupDocuments = Array<{ doc_type: string; path: string; file_name: string; expires_on: string | null }>;

/**
 * Uploads the collected document files to storage via signed URLs.
 * Called during submit, after the user is authenticated. Returns the
 * metadata that complete-partner-signup registers against the new org.
 */
export async function uploadSignupDocuments(
  files: Record<string, File | null>,
  expiry: Record<string, string>,
): Promise<SignupDocuments> {
  const docs: SignupDocuments = [];
  for (const [key, file] of Object.entries(files)) {
    if (!file) continue;
    if (file.size > 10 * 1024 * 1024) throw new Error("Files must be under 10 MB.");
    const { data, error } = await supabase.functions.invoke("signup-support", {
      body: { action: "doc_upload_url", file_name: file.name },
    });
    if (error || !data?.ok) throw new Error(data?.error || "Could not prepare document upload.");
    const { error: upError } = await supabase.storage.from("partner-documents").uploadToSignedUrl(data.path, data.token, file);
    if (upError) throw new Error("Document upload failed. Please try again.");
    docs.push({ doc_type: key, path: data.path, file_name: file.name, expires_on: expiry[key] || null });
  }
  return docs;
}

// ---------------------------------------------------------------------------
// Password fields with inline validation + autofill hardening.
// readOnly-until-focus stops password managers from injecting unknown values
// into fresh signup fields; the field becomes editable on first focus.
// ---------------------------------------------------------------------------
export function SignupPasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
}: {
  password: string;
  confirmPassword: string;
  onPasswordChange: (v: string) => void;
  onConfirmChange: (v: string) => void;
}) {
  const pwError = password ? validatePassword(password) : null;
  const matchError = confirmPassword && password !== confirmPassword ? "Passwords do not match" : null;
  const clearReadOnly = (e: React.FocusEvent<HTMLInputElement>) => e.target.removeAttribute("readonly");
  return (
    <>
      <div>
        <Label>Password *</Label>
        <PasswordInput
          autoComplete="new-password"
          readOnly
          onFocus={clearReadOnly}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="••••••••"
        />
        {pwError ? (
          <p className="text-xs text-destructive mt-1">{pwError}</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">8+ characters, with uppercase, lowercase, and a number.</p>
        )}
      </div>
      <div>
        <Label>Confirm Password *</Label>
        <PasswordInput
          autoComplete="new-password"
          readOnly
          onFocus={clearReadOnly}
          value={confirmPassword}
          onChange={(e) => onConfirmChange(e.target.value)}
          placeholder="••••••••"
        />
        {matchError && <p className="text-xs text-destructive mt-1">{matchError}</p>}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// EIN verification step (nonprofit).
// ---------------------------------------------------------------------------
export function EINStep({
  ein,
  setEin,
  einResult,
  setEinResult,
  onBack,
  onContinue,
}: {
  ein: string;
  setEin: (v: string) => void;
  einResult: EinResult;
  setEinResult: (r: EinResult) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const r = await verifyEin(ein);
      setEinResult(r);
    } catch (e: any) {
      toast.error(e.message || "Could not verify the EIN.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">EIN Verification</h2>
      <p className="text-sm text-muted-foreground">
        We check your EIN against IRS records (via ProPublica Nonprofit Explorer) to confirm 501(c)(3) status.
      </p>
      <div>
        <Label>EIN *</Label>
        <Input placeholder="12-3456789" autoComplete="off" value={ein} onChange={(e) => { setEin(e.target.value); setEinResult(null); }} />
      </div>
      {einResult && (
        <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${einResult.status === "verified" ? "border-primary text-primary" : "border-destructive text-destructive"}`}>
          {einResult.status === "verified" ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>
            {einResult.status === "verified"
              ? `Verified 501(c)(3)${einResult.irs_name ? `: ${einResult.irs_name}` : ""}`
              : `Admin assistance needed — ${einResult.reason} You can keep going; our team will follow up.`}
          </span>
        </div>
      )}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>Back</Button>
        {einResult ? (
          <Button className="flex-1" onClick={onContinue}>Continue</Button>
        ) : (
          <Button className="flex-1" disabled={busy || ein.replace(/\D/g, "").length !== 9} onClick={run}>
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking IRS records…</> : "Verify EIN"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agreement e-signature step.
// ---------------------------------------------------------------------------
export type SigState = { name: string; title: string; authorized: boolean; consent: boolean; templateId: string | null };

export function SignatureStep({
  pathway,
  sig,
  setSig,
  onBack,
  onContinue,
}: {
  pathway: "venue" | "nonprofit" | "government" | "one_time_event";
  sig: SigState;
  setSig: (s: SigState) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [template, setTemplate] = useState<AgreementTemplate | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetchAgreementTemplate(pathway).then((t) => { setTemplate(t); if (t) setSig({ ...sig, templateId: t.id }); }).catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathway]);
  const valid = sig.templateId && sig.name.trim().length >= 3 && sig.title.trim().length >= 2 && sig.authorized && sig.consent;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Partnership Agreement</h2>
      {!template && !failed && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading agreement…</p>}
      {failed && <p className="text-sm text-muted-foreground">The agreement is being updated. Please check back shortly.</p>}
      {template && (
        <>
          <p className="text-sm font-medium">{template.title} <span className="font-normal text-muted-foreground">v{template.version}</span></p>
          <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm border rounded-md p-4 bg-muted">{template.body}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Type your full legal name *</Label><Input autoComplete="off" value={sig.name} onChange={(e) => setSig({ ...sig, name: e.target.value })} /></div>
            <div><Label>Your title *</Label><Input autoComplete="off" value={sig.title} onChange={(e) => setSig({ ...sig, title: e.target.value })} /></div>
          </div>
          <label className="flex items-start gap-2 text-sm"><Checkbox checked={sig.authorized} onCheckedChange={(v) => setSig({ ...sig, authorized: !!v })} />I am authorized to sign on behalf of this organization.</label>
          <label className="flex items-start gap-2 text-sm"><Checkbox checked={sig.consent} onCheckedChange={(v) => setSig({ ...sig, consent: !!v })} />I agree to sign electronically and that my typed name is my legal signature.</label>
          <p className="text-xs text-muted-foreground">We record your name, title, the time, your IP address and an exact copy of this agreement version.</p>
        </>
      )}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>Back</Button>
        <Button className="flex-1" disabled={!valid} onClick={onContinue}><FileText className="w-4 h-4 mr-2" />Sign and continue</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documents step (certificate of insurance).
// ---------------------------------------------------------------------------
export function DocumentsStep({
  files,
  setFiles,
  expiry,
  setExpiry,
  required,
  onBack,
  onContinue,
}: {
  files: Record<string, File | null>;
  setFiles: (f: Record<string, File | null>) => void;
  expiry: Record<string, string>;
  setExpiry: (e: Record<string, string>) => void;
  required: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const file = files["insurance"];
  const canContinue = !required || (file && expiry["insurance"]);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Insurance</h2>
      <p className="text-sm text-muted-foreground">Upload your certificate of insurance{required ? "" : " (optional)"}. We use it to confirm coverage before approval.</p>
      <div className="space-y-2 border rounded-md p-4">
        <p className="font-medium text-sm">Certificate of insurance{required ? " *" : ""}</p>
        {file && <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" />{file.name}</p>}
        <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
          <Input type="file" accept=".pdf,image/*" onChange={(e) => setFiles({ ...files, insurance: e.target.files?.[0] ?? null })} />
          <div><Label className="text-xs">Expiration date *</Label><Input type="date" value={expiry["insurance"] ?? ""} onChange={(e) => setExpiry({ ...expiry, insurance: e.target.value })} /></div>
        </div>
        <p className="text-xs text-muted-foreground">PDF or image, under 10 MB.</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>Back</Button>
        <Button className="flex-1" disabled={!canContinue} onClick={onContinue}>Continue</Button>
      </div>
    </div>
  );
}
