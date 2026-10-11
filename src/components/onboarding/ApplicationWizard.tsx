import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Clock, FileText, Loader2, ShieldCheck, Upload } from "lucide-react";
import { onboardingApi, uploadPartnerDocument, STATUS_LABEL, KIND_LABEL, type OrgKind, type AppStatus } from "@/lib/partnerOnboarding";

const VENUE_TYPES = ["restaurant", "food_truck", "cafe", "catering_company", "hotel", "stadium", "arena", "convention_center", "grocery_store", "farm", "festival", "resort", "airport", "food_manufacturer", "food_distributor", "hospitality_group", "food_beverage_group", "franchise"];
const STATUS_ORDER: AppStatus[] = ["applied", "verifying", "pending_review", "active"];

type Loaded = {
  application: any; template: { id: string; version: number; title: string; body: string } | null;
  signature: any | null; documents: any[]; slots: { key: string; label: string; required: boolean; needs_expiry: boolean }[];
};

const empty = { org_kind: "venue" as OrgKind, organization_type: "restaurant", organization_name: "", contact_name: "", contact_title: "", contact_email: "", contact_phone: "", address: "", city: "", state: "", zip: "", event_name: "", event_date: "" };

/** Self-serve application. `token` = emailed resume token; `signedIn` = portal mode (uses the session). */
export default function ApplicationWizard({ token: initialToken, signedIn = false, onToken }: { token?: string | null; signedIn?: boolean; onToken?: (t: string) => void }) {
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(!!initialToken || signedIn);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);
  const [f, setF] = useState(empty);
  const [ein, setEin] = useState("");
  const [einMsg, setEinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sig, setSig] = useState({ name: "", title: "", authorized: false, consent: false });
  const [expiry, setExpiry] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [notFound, setNotFound] = useState(false);

  const base = token ? { token } : {};
  const load = useCallback(async () => {
    if (!token && !signedIn) return;
    try {
      const d: Loaded = await onboardingApi("load", token ? { token } : {});
      setData(d);
      const a = d.application;
      setF({ ...empty, ...Object.fromEntries(Object.keys(empty).map((k) => [k, a[k] ?? (empty as any)[k]])) });
      setEin(a.ein ?? "");
      setStep(Math.min(a.current_step ?? 1, 5));
    } catch { setNotFound(true); } finally { setLoading(false); }
  }, [token, signedIn]);
  useEffect(() => { load(); }, [load]);

  const app = data?.application;
  const kind: OrgKind = app?.org_kind ?? f.org_kind;
  const steps = ["Account basics", ...(kind === "nonprofit" ? ["EIN verification"] : []), "Agreement", "Documents", "Review & submit"];
  // Map visual step index to logical step number (1 basics, 2 ein, 3 sign, 4 docs, 5 submit).
  const logical = steps.map((s) => ({ "Account basics": 1, "EIN verification": 2, Agreement: 3, Documents: 4, "Review & submit": 5 } as Record<string, number>)[s]);
  const current = kind !== "nonprofit" && step === 2 ? 3 : step;
  const submitted = app && !["draft", "applied", "verifying"].includes(app.status);
  const set = (k: keyof typeof empty, v: string) => setF((p) => ({ ...p, [k]: v }));

  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e: any) { toast({ title: "Something needs attention", description: e.message, variant: "destructive" }); } finally { setBusy(false); } };

  const saveBasics = () => run(async () => {
    const basics = { ...f, event_name: f.event_name || null, event_date: f.event_date || null, organization_type: f.org_kind === "venue" ? f.organization_type : null };
    if (!token && !signedIn) {
      const r = await onboardingApi("start", { basics });
      setToken(r.token); onToken?.(r.token);
      toast({ title: "Progress saved", description: "We emailed you a link to resume any time." });
      setLoading(true);
      return;
    }
    await onboardingApi("save", { ...base, basics });
    await load(); setStep(kind === "nonprofit" ? 2 : 3);
  });
  useEffect(() => { if (token && !data) load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const verifyEin = () => run(async () => {
    const r = await onboardingApi("verify_ein", { ...base, ein });
    setEinMsg({ ok: r.ein_status === "verified", text: r.ein_status === "verified" ? `Verified 501(c)(3)${r.irs_name ? `: ${r.irs_name}` : ""}` : `Admin assistance needed — ${r.reason} You can keep going; our team will follow up.` });
    await load(); setStep(3);
  });

  const sign = () => run(async () => {
    await onboardingApi("sign", { ...base, template_id: data!.template!.id, signer_name: sig.name, signer_title: sig.title, authorized: sig.authorized, consent_electronic: sig.consent });
    toast({ title: "Agreement signed", description: "A copy was emailed to you." });
    await load(); setStep(4);
  });

  const upload = (slotKey: string, needsExpiry: boolean) => run(async () => {
    const file = files[slotKey];
    if (!file) throw new Error("Choose a file first.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Files must be under 10 MB.");
    if (needsExpiry && !expiry[slotKey]) throw new Error("Enter the expiration date.");
    await uploadPartnerDocument(token, file, slotKey, expiry[slotKey] || null);
    setFiles((p) => ({ ...p, [slotKey]: null }));
    toast({ title: "Document uploaded" });
    await load();
  });

  const submit = () => run(async () => {
    await onboardingApi("submit", base);
    toast({ title: "Application submitted", description: "Check your email to set your password." });
    await load();
  });

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (notFound && !signedIn) return <Card><CardContent className="py-10 text-center">This resume link is invalid. Check your email for the latest link, or contact hello@hariet.ai.</CardContent></Card>;
  if (notFound && signedIn) return null;

  const signature = data?.signature;
  const docs = data?.documents ?? [];
  const docFor = (k: string) => docs.find((d) => d.doc_type === k);

  const StatusCard = app && (
    <Card className="mb-6"><CardContent className="py-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><p className="text-sm text-muted-foreground">{KIND_LABEL[app.org_kind as OrgKind]} application</p><p className="font-semibold text-lg">{app.organization_name}</p></div>
        <Badge variant={app.status === "active" ? "default" : app.status === "rejected" || app.status === "suspended" ? "destructive" : "secondary"}>{STATUS_LABEL[app.status as AppStatus]}</Badge>
      </div>
      <ol className="flex gap-2 text-xs flex-wrap">
        {STATUS_ORDER.map((s) => {
          const reached = STATUS_ORDER.indexOf(app.status) >= STATUS_ORDER.indexOf(s);
          return <li key={s} className={`px-2 py-1 rounded-full border ${reached ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground"}`}>{STATUS_LABEL[s]}</li>;
        })}
      </ol>
      {app.status === "rejected" && app.rejection_reason && <p className="text-sm text-destructive">Reason: {app.rejection_reason}. Upload corrected documents below and we'll review again.</p>}
      {app.status === "pending_review" && <p className="text-sm text-muted-foreground">You can't post or claim donations until approval. We'll email you as soon as your review is done.</p>}
    </CardContent></Card>
  );

  // ---------- Post-submission portal view ----------
  if (submitted) {
    return (
      <div>
        {StatusCard}
        {!signature && data?.template && <SignBlock template={data.template} sig={sig} setSig={setSig} onSign={sign} busy={busy} />}
        {signature && <SignedBlock s={signature} />}
        <DocsBlock slots={data!.slots} docFor={docFor} files={files} setFiles={setFiles} expiry={expiry} setExpiry={setExpiry} onUpload={upload} busy={busy} />
      </div>
    );
  }

  return (
    <div>
      {StatusCard}
      <ol className="flex gap-2 mb-6 flex-wrap">
        {steps.map((s, i) => (
          <li key={s} className={`text-xs px-3 py-1 rounded-full border ${logical[i] === current ? "bg-primary text-primary-foreground border-primary" : logical[i] < current ? "border-primary text-primary" : "text-muted-foreground"}`}>{i + 1}. {s}</li>
        ))}
      </ol>

      {current === 1 && (
        <Card><CardHeader><CardTitle>Account basics</CardTitle></CardHeader><CardContent className="space-y-4">
          {!app && (
            <div><Label>I'm signing up as *</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(["venue", "nonprofit", "one_time_event"] as OrgKind[]).map((k) => (
                  <Button key={k} type="button" variant={f.org_kind === k ? "default" : "outline"} onClick={() => set("org_kind", k)}>{KIND_LABEL[k]}</Button>
                ))}
              </div>
            </div>
          )}
          <div><Label>{f.org_kind === "one_time_event" ? "Host / organization name *" : "Organization name *"}</Label><Input autoComplete="off" value={f.organization_name} onChange={(e) => set("organization_name", e.target.value)} /></div>
          {f.org_kind === "venue" && (
            <div><Label>Business type *</Label>
              <select className="w-full border border-input bg-background rounded-md h-10 px-3" value={f.organization_type} onChange={(e) => set("organization_type", e.target.value)}>
                {VENUE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select></div>
          )}
          {f.org_kind === "one_time_event" && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Event name *</Label><Input value={f.event_name} onChange={(e) => set("event_name", e.target.value)} /></div>
              <div><Label>Event date *</Label><Input type="date" value={f.event_date} onChange={(e) => set("event_date", e.target.value)} /></div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Contact name *</Label><Input autoComplete="off" value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></div>
            <div><Label>Title</Label><Input autoComplete="off" value={f.contact_title} onChange={(e) => set("contact_title", e.target.value)} /></div>
            <div><Label>Contact email *</Label><Input type="email" autoComplete="off" disabled={!!app} value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></div>
            <div><Label>Contact phone *</Label><Input autoComplete="off" value={f.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} /></div>
          </div>
          <div><Label>Street address *</Label><Input autoComplete="off" value={f.address} onChange={(e) => set("address", e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>City *</Label><Input autoComplete="off" value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div><Label>State *</Label><Input autoComplete="off" maxLength={2} value={f.state} onChange={(e) => set("state", e.target.value.toUpperCase())} /></div>
            <div><Label>ZIP *</Label><Input autoComplete="off" value={f.zip} onChange={(e) => set("zip", e.target.value)} /></div>
          </div>
          <Button className="w-full" disabled={busy} onClick={saveBasics}>{busy ? "Saving…" : "Save and continue"}</Button>
        </CardContent></Card>
      )}

      {current === 2 && (
        <Card><CardHeader><CardTitle>EIN verification</CardTitle></CardHeader><CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">We check your EIN against IRS records (via ProPublica Nonprofit Explorer) to confirm 501(c)(3) status.</p>
          <div><Label>EIN *</Label><Input placeholder="12-3456789" value={ein} onChange={(e) => setEin(e.target.value)} /></div>
          {(einMsg || app?.ein_status === "verified" || app?.ein_status === "needs_help") && (
            <EinStatus ok={einMsg ? einMsg.ok : app.ein_status === "verified"} text={einMsg?.text ?? (app.ein_status === "verified" ? "Verified 501(c)(3)" : "Admin assistance needed — our team will follow up.")} />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" disabled={busy} onClick={verifyEin}>{busy ? "Checking IRS records…" : "Verify EIN"}</Button>
          </div>
        </CardContent></Card>
      )}

      {current === 3 && (
        signature ? (<><SignedBlock s={signature} /><Button className="w-full mt-4" onClick={() => setStep(4)}>Continue</Button></>)
          : data?.template ? <SignBlock template={data.template} sig={sig} setSig={setSig} onSign={sign} busy={busy} onBack={() => setStep(kind === "nonprofit" ? 2 : 1)} />
            : <Card><CardContent className="py-8 text-center text-muted-foreground">The agreement is being updated. Please check back shortly.</CardContent></Card>
      )}

      {current === 4 && (
        <>
          <DocsBlock slots={data!.slots} docFor={docFor} files={files} setFiles={setFiles} expiry={expiry} setExpiry={setExpiry} onUpload={upload} busy={busy} />
          <div className="flex gap-2 mt-4"><Button variant="outline" onClick={() => setStep(3)}>Back</Button>
            <Button className="flex-1" disabled={data!.slots.some((s) => s.required && !docFor(s.key))} onClick={() => setStep(5)}>Continue</Button></div>
        </>
      )}

      {current === 5 && (
        <Card><CardHeader><CardTitle>Review & submit</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
          <Row ok label="Account basics" />
          {kind === "nonprofit" && <Row ok={app?.ein_status === "verified"} warn={app?.ein_status === "needs_help"} label={app?.ein_status === "verified" ? "EIN verified" : "EIN — admin assistance needed"} />}
          <Row ok={!!signature} label={signature ? `Agreement signed (v${signature.template_version})` : "Agreement not signed"} />
          <Row ok={data!.slots.filter((s) => s.required).every((s) => docFor(s.key))} label="Required documents uploaded" />
          <p className="text-muted-foreground">After you submit, your account is created in "pending review". We'll email you a secure link to set your password.</p>
          <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(4)}>Back</Button>
            <Button className="flex-1" disabled={busy || !signature} onClick={submit}>{busy ? "Submitting…" : "Submit application"}</Button></div>
        </CardContent></Card>
      )}
    </div>
  );
}

function Row({ ok, warn, label }: { ok?: boolean; warn?: boolean; label: string }) {
  return <div className="flex items-center gap-2">{ok ? <CheckCircle2 className="w-4 h-4 text-primary" /> : warn ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <Clock className="w-4 h-4 text-muted-foreground" />}{label}</div>;
}

function EinStatus({ ok, text }: { ok: boolean; text: string }) {
  return <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${ok ? "border-primary text-primary" : "border-destructive text-destructive"}`}>{ok ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}<span>{text}</span></div>;
}

function SignedBlock({ s }: { s: any }) {
  return <Card><CardContent className="py-5 text-sm space-y-1">
    <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="w-4 h-4 text-primary" />{s.agreement_title} — version {s.template_version}</p>
    <p className="text-muted-foreground">Signed by {s.signer_name}, {s.signer_title} on {new Date(s.signed_at).toLocaleString()}</p>
    <p className="text-xs text-muted-foreground break-all">Fingerprint: {s.body_sha256}</p>
  </CardContent></Card>;
}

function SignBlock({ template, sig, setSig, onSign, busy, onBack }: any) {
  return <Card><CardHeader><CardTitle>{template.title} <span className="text-sm font-normal text-muted-foreground">v{template.version}</span></CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm border rounded-md p-4 bg-muted">{template.body}</div>
    <div className="grid sm:grid-cols-2 gap-3">
      <div><Label>Type your full legal name *</Label><Input autoComplete="off" value={sig.name} onChange={(e) => setSig({ ...sig, name: e.target.value })} /></div>
      <div><Label>Your title *</Label><Input autoComplete="off" value={sig.title} onChange={(e) => setSig({ ...sig, title: e.target.value })} /></div>
    </div>
    <label className="flex items-start gap-2 text-sm"><Checkbox checked={sig.authorized} onCheckedChange={(v) => setSig({ ...sig, authorized: !!v })} />I am authorized to sign on behalf of this organization.</label>
    <label className="flex items-start gap-2 text-sm"><Checkbox checked={sig.consent} onCheckedChange={(v) => setSig({ ...sig, consent: !!v })} />I agree to sign electronically and that my typed name is my legal signature.</label>
    <p className="text-xs text-muted-foreground">We record your name, title, the time, your IP address and an exact copy of this agreement version.</p>
    <div className="flex gap-2">{onBack && <Button variant="outline" onClick={onBack}>Back</Button>}
      <Button className="flex-1" disabled={busy || sig.name.trim().length < 3 || sig.title.trim().length < 2 || !sig.authorized || !sig.consent} onClick={onSign}><FileText className="w-4 h-4 mr-2" />Sign agreement</Button></div>
  </CardContent></Card>;
}

function DocsBlock({ slots, docFor, files, setFiles, expiry, setExpiry, onUpload, busy }: any) {
  return <Card className="mt-4"><CardHeader><CardTitle>Documents</CardTitle></CardHeader><CardContent className="space-y-5">
    {slots.map((s: any) => {
      const d = docFor(s.key);
      return <div key={s.key} className="space-y-2 border-b pb-4 last:border-0">
        <div className="flex items-center justify-between"><p className="font-medium">{s.label}{s.required ? " *" : ""}</p>
          {d && <Badge variant={d.status === "approved" ? "default" : d.status === "rejected" ? "destructive" : "secondary"}>{d.status === "submitted" ? "In review" : d.status}</Badge>}</div>
        {d && <p className="text-xs text-muted-foreground">{d.file_name}{d.expires_on ? ` · expires ${d.expires_on}` : ""}{d.review_notes ? ` · ${d.review_notes}` : ""}</p>}
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
          <Input type="file" accept=".pdf,image/*" onChange={(e) => setFiles((p: any) => ({ ...p, [s.key]: e.target.files?.[0] ?? null }))} />
          {s.needs_expiry && <div><Label className="text-xs">Expiration date *</Label><Input type="date" value={expiry[s.key] ?? ""} onChange={(e) => setExpiry((p: any) => ({ ...p, [s.key]: e.target.value }))} /></div>}
          <Button variant="outline" disabled={busy || !files[s.key]} onClick={() => onUpload(s.key, s.needs_expiry)}><Upload className="w-4 h-4 mr-1" />{d ? "Replace" : "Upload"}</Button>
        </div>
      </div>;
    })}
  </CardContent></Card>;
}
