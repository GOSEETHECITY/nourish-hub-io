import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { onboardingAdminApi, STATUS_LABEL, KIND_LABEL, type OrgKind } from "@/lib/partnerOnboarding";

type Filter = "all" | "docs" | "ein" | "ready";
const sb = supabase as any;

async function act(action: string, body: Record<string, unknown>, ok: string, after?: () => void) {
  try { await onboardingAdminApi(action, body); toast({ title: ok }); after?.(); }
  catch (e: any) { toast({ title: "Action failed", description: e.message, variant: "destructive" }); }
}

export default function OnboardingQueue() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "queue";
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Partner onboarding</h1><p className="text-muted-foreground">Review applications, agreements, insurance and nonprofit verification.</p></div>
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
        <TabsList><TabsTrigger value="queue">Review queue</TabsTrigger><TabsTrigger value="assisted">Assisted signup</TabsTrigger><TabsTrigger value="insurance">Insurance & pauses</TabsTrigger><TabsTrigger value="agreements">Agreements</TabsTrigger><TabsTrigger value="slots">Document slots</TabsTrigger></TabsList>
        <TabsContent value="queue"><Queue /></TabsContent>
        <TabsContent value="assisted"><Assisted /></TabsContent>
        <TabsContent value="insurance"><Insurance /></TabsContent>
        <TabsContent value="agreements"><Agreements /></TabsContent>
        <TabsContent value="slots"><Slots /></TabsContent>
      </Tabs>
    </div>
  );
}

function Queue() {
  const [apps, setApps] = useState<any[]>([]);
  const [sigs, setSigs] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [showClosed, setShowClosed] = useState(false);
  const [open, setOpen] = useState<any | null>(null);

  const load = async () => {
    const { data } = await sb.from("partner_applications").select("*").order("created_at", { ascending: false }).limit(500);
    setApps(data ?? []);
    const ids = (data ?? []).map((a: any) => a.id);
    if (ids.length) {
      const { data: s } = await sb.from("agreement_signatures").select("*").in("application_id", ids);
      setSigs(Object.fromEntries((s ?? []).map((x: any) => [x.application_id, x])));
    }
  };
  useEffect(() => { load(); }, []);

  const ready = (a: any) => !!sigs[a.id] && a.docs_status === "approved" && (a.org_kind !== "nonprofit" || a.ein_status === "verified");
  const rows = useMemo(() => apps.filter((a) => {
    if (!showClosed && ["active", "rejected", "draft"].includes(a.status) && filter === "all") return false;
    if (filter === "docs") return ["missing", "submitted", "rejected"].includes(a.docs_status) && a.status !== "active";
    if (filter === "ein") return a.ein_status === "needs_help" && a.status !== "active";
    if (filter === "ready") return a.status === "pending_review" && ready(a);
    return true;
  }), [apps, filter, sigs, showClosed]);

  return (
    <Card><CardContent className="pt-6 space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {([["all", "All open"], ["docs", "Awaiting docs"], ["ein", "EIN needs help"], ["ready", "Ready to approve"]] as [Filter, string][]).map(([k, l]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{l} ({apps.filter((a) => k === "all" ? !["active", "rejected", "draft"].includes(a.status) : k === "docs" ? ["missing", "submitted", "rejected"].includes(a.docs_status) && a.status !== "active" : k === "ein" ? a.ein_status === "needs_help" && a.status !== "active" : a.status === "pending_review" && ready(a)).length})</Button>
        ))}
        {filter === "all" && <label className="flex items-center gap-2 text-sm ml-auto"><Checkbox checked={showClosed} onCheckedChange={(v) => setShowClosed(!!v)} />Show active, rejected & drafts</label>}
      </div>
      <Table><TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>EIN</TableHead><TableHead>Agreement</TableHead><TableHead>Documents</TableHead><TableHead>Applied</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id} className="cursor-pointer" onClick={() => setOpen(a)}>
              <TableCell className="font-medium">{a.organization_name}{a.assisted_by && <Badge variant="outline" className="ml-2">Assisted</Badge>}</TableCell>
              <TableCell>{KIND_LABEL[a.org_kind as OrgKind]}</TableCell>
              <TableCell><Badge variant={a.status === "active" ? "default" : ["rejected", "suspended"].includes(a.status) ? "destructive" : "secondary"}>{STATUS_LABEL[a.status as keyof typeof STATUS_LABEL]}</Badge></TableCell>
              <TableCell>{a.org_kind !== "nonprofit" ? "—" : a.ein_status === "verified" ? <ShieldCheck className="w-4 h-4 text-primary" /> : a.ein_status === "needs_help" ? <span className="text-destructive text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Needs help</span> : "Pending"}</TableCell>
              <TableCell>{sigs[a.id] ? `v${sigs[a.id].template_version}` : a.agreement_bypassed ? "Bypassed" : "Not signed"}</TableCell>
              <TableCell className="capitalize">{a.docs_status}</TableCell>
              <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
          {!rows.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No applications in this view.</TableCell></TableRow>}
        </TableBody></Table>
      {open && <Detail app={open} sig={sigs[open.id]} onClose={() => setOpen(null)} onChanged={async () => { await load(); const { data } = await sb.from("partner_applications").select("*").eq("id", open.id).single(); setOpen(data); }} />}
    </CardContent></Card>
  );
}

function Detail({ app, sig, onClose, onChanged }: { app: any; sig: any; onClose: () => void; onChanged: () => void }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [entity, setEntity] = useState<any>(null);
  const kind = app.created_nonprofit_id ? "nonprofit" : "organization";
  const entityId = app.created_nonprofit_id ?? app.created_organization_id;

  const load = async () => {
    const { data } = await sb.from("partner_documents").select("*").eq("application_id", app.id).order("created_at", { ascending: false });
    setDocs(data ?? []);
    if (entityId) {
      const { data: e } = await sb.from(kind === "nonprofit" ? "nonprofits" : "organizations").select("id, is_active, posting_paused, paused_reason, approval_status").eq("id", entityId).maybeSingle();
      setEntity(e);
    }
  };
  useEffect(() => { load(); }, [app.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = () => { load(); onChanged(); };

  const view = async (path: string) => {
    const { data, error } = await supabase.storage.from("partner-documents").createSignedUrl(path, 300);
    if (error || !data) { toast({ title: "Could not open file", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{app.organization_name}</DialogTitle></DialogHeader>
        <div className="space-y-5 text-sm">
          <div className="grid sm:grid-cols-2 gap-2">
            <p><strong>Type:</strong> {KIND_LABEL[app.org_kind as OrgKind]}{app.organization_type ? ` · ${app.organization_type.replace(/_/g, " ")}` : ""}</p>
            <p><strong>Status:</strong> {STATUS_LABEL[app.status as keyof typeof STATUS_LABEL]}</p>
            <p><strong>Contact:</strong> {app.contact_name}{app.contact_title ? `, ${app.contact_title}` : ""}</p>
            <p><strong>Email / phone:</strong> {app.contact_email} · {app.contact_phone}</p>
            <p className="sm:col-span-2"><strong>Address:</strong> {[app.address, app.city, app.state, app.zip].filter(Boolean).join(", ")}</p>
            {app.org_kind === "one_time_event" && <p><strong>Event:</strong> {app.event_name} on {app.event_date}</p>}
          </div>

          {app.org_kind === "nonprofit" && (
            <section className="border rounded-md p-3 space-y-2">
              <p className="font-semibold">EIN {app.ein ?? "—"} · {app.ein_status === "verified" ? "Verified 501(c)(3)" : app.ein_status === "needs_help" ? "Admin assistance needed" : "Not checked"}</p>
              {app.ein_result && <p className="text-muted-foreground">{app.ein_result.reason}{app.ein_result.name ? ` · IRS name: ${app.ein_result.name}` : ""}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => act("set_ein", { application_id: app.id, ein_status: "verified", note: "Manually verified by admin" }, "EIN marked verified", refresh)}>Mark verified manually</Button>
                {app.ein && <a className="text-primary underline inline-flex items-center gap-1" target="_blank" rel="noopener noreferrer" href={`https://projects.propublica.org/nonprofits/organizations/${app.ein}`}>ProPublica <ExternalLink className="w-3 h-3" /></a>}
              </div>
            </section>
          )}

          <section className="border rounded-md p-3 space-y-1">
            <p className="font-semibold">Agreement</p>
            {sig ? (<>
              <p className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-primary" />{sig.agreement_title} v{sig.template_version}</p>
              <p className="text-muted-foreground">Signed by {sig.signer_name} ({sig.signer_title}) · {new Date(sig.signed_at).toLocaleString()} · IP {sig.ip_address ?? "unknown"}</p>
              <p className="text-xs text-muted-foreground break-all">SHA-256 {sig.body_sha256}</p>
            </>) : <p className="text-muted-foreground">{app.agreement_bypassed ? "Bypassed during assisted signup — applicant must sign in their portal before approval." : "Not signed yet."}</p>}
          </section>

          <section className="border rounded-md p-3 space-y-3">
            <p className="font-semibold">Documents</p>
            {docs.filter((d) => d.status !== "superseded").map((d) => (
              <div key={d.id} className="space-y-2 border-b pb-3 last:border-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="capitalize">{d.doc_type.replace(/_/g, " ")} · {d.file_name}{d.expires_on ? ` · expires ${d.expires_on}` : ""}</span>
                  <Badge variant={d.status === "approved" ? "default" : d.status === "rejected" ? "destructive" : "secondary"}>{d.status}</Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => view(d.file_path)}>View</Button>
                  <Button size="sm" onClick={() => act("review_doc", { document_id: d.id, decision: "approved" }, "Document approved", refresh)}>Approve</Button>
                  <Input className="h-9 max-w-xs" placeholder="Reason if rejecting" value={notes[d.id] ?? ""} onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })} />
                  <Button size="sm" variant="destructive" onClick={() => act("review_doc", { document_id: d.id, decision: "rejected", notes: notes[d.id] }, "Document rejected — applicant emailed", refresh)}>Reject</Button>
                </div>
              </div>
            ))}
            {!docs.length && <p className="text-muted-foreground">No documents uploaded.</p>}
          </section>

          {entity && (
            <section className="border rounded-md p-3 flex items-center justify-between gap-2 flex-wrap">
              <div><p className="font-semibold">Access</p><p className="text-muted-foreground">{entity.is_active ? "Active — users can sign in" : "Deactivated — users cannot sign in"}{entity.posting_paused ? ` · Activity paused (${entity.paused_reason?.replace(/_/g, " ")})` : ""}</p></div>
              <div className="flex gap-2">
                {entity.posting_paused && <Button size="sm" variant="outline" onClick={() => act("clear_pause", { kind, id: entity.id, mark_verified: entity.paused_reason === "ein_status_change" }, "Pause cleared", refresh)}>Clear pause</Button>}
                <Button size="sm" variant={entity.is_active ? "destructive" : "default"} onClick={() => act("set_access", { kind, id: entity.id, active: !entity.is_active }, entity.is_active ? "Deactivated" : "Activated", refresh)}>{entity.is_active ? "Deactivate" : "Activate"}</Button>
              </div>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <Button disabled={app.status === "active"} onClick={() => act("approve", { application_id: app.id }, "Approved — applicant emailed", refresh)}>Approve application</Button>
              <Button variant="outline" onClick={() => act("resend_link", { application_id: app.id }, "Links re-sent")}>Resend applicant links</Button>
            </div>
            <Textarea placeholder="Rejection reason (sent to the applicant with a re-upload link)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button variant="destructive" disabled={!reason.trim()} onClick={() => act("reject", { application_id: app.id, reason }, "Rejected — applicant emailed", refresh)}>Reject with reason</Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Assisted() {
  const blank = { org_kind: "venue", organization_type: "restaurant", organization_name: "", contact_name: "", contact_title: "", contact_email: "", contact_phone: "", address: "", city: "", state: "", zip: "", ein: "", event_name: "", event_date: "", bypass_agreement: true };
  const [f, setF] = useState<any>(blank);
  const [busy, setBusy] = useState(false);
  const s = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const submit = async () => {
    setBusy(true);
    await act("assisted_create", { basics: { ...f, ein: f.ein || null, event_name: f.event_name || null, event_date: f.event_date || null } }, "Account created — applicant emailed a secure sign-in link", () => setF(blank));
    setBusy(false);
  };
  return (
    <Card><CardHeader><CardTitle>Set someone up on a call</CardTitle></CardHeader><CardContent className="space-y-3 max-w-2xl">
      <div className="flex gap-2">{(["venue", "nonprofit", "one_time_event"] as OrgKind[]).map((k) => <Button key={k} size="sm" variant={f.org_kind === k ? "default" : "outline"} onClick={() => s("org_kind", k)}>{KIND_LABEL[k]}</Button>)}</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label>Organization name *</Label><Input value={f.organization_name} onChange={(e) => s("organization_name", e.target.value)} /></div>
        {f.org_kind === "nonprofit" ? <div><Label>EIN *</Label><Input value={f.ein} onChange={(e) => s("ein", e.target.value)} /></div>
          : f.org_kind === "venue" ? <div><Label>Business type</Label><Input value={f.organization_type} onChange={(e) => s("organization_type", e.target.value)} /></div> : <div />}
        {f.org_kind === "one_time_event" && <><div><Label>Event name *</Label><Input value={f.event_name} onChange={(e) => s("event_name", e.target.value)} /></div><div><Label>Event date *</Label><Input type="date" value={f.event_date} onChange={(e) => s("event_date", e.target.value)} /></div></>}
        <div><Label>Contact name *</Label><Input value={f.contact_name} onChange={(e) => s("contact_name", e.target.value)} /></div>
        <div><Label>Title</Label><Input value={f.contact_title} onChange={(e) => s("contact_title", e.target.value)} /></div>
        <div><Label>Email *</Label><Input type="email" value={f.contact_email} onChange={(e) => s("contact_email", e.target.value)} /></div>
        <div><Label>Phone *</Label><Input value={f.contact_phone} onChange={(e) => s("contact_phone", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label>Street address *</Label><Input value={f.address} onChange={(e) => s("address", e.target.value)} /></div>
        <div><Label>City *</Label><Input value={f.city} onChange={(e) => s("city", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2"><div><Label>State *</Label><Input maxLength={2} value={f.state} onChange={(e) => s("state", e.target.value.toUpperCase())} /></div><div><Label>ZIP *</Label><Input value={f.zip} onChange={(e) => s("zip", e.target.value)} /></div></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.bypass_agreement} onCheckedChange={(v) => s("bypass_agreement", !!v)} />Bypass agreement for now (applicant signs inside their portal)</label>
      <p className="text-xs text-muted-foreground">The account is created as pending. The applicant receives a one-time link to set their own password — no password is ever shown or emailed. Nothing activates until the agreement is signed and documents are approved.</p>
      <Button disabled={busy} onClick={submit}>{busy ? "Creating…" : "Create pending account"}</Button>
    </CardContent></Card>
  );
}

function Insurance() {
  const [docs, setDocs] = useState<any[]>([]);
  const [apps, setApps] = useState<Record<string, any>>({});
  const [paused, setPaused] = useState<any[]>([]);
  const load = async () => {
    const soon = new Date(Date.now() + 60 * 86400_000).toISOString().slice(0, 10);
    const { data } = await sb.from("partner_documents").select("*").eq("doc_type", "insurance").eq("status", "approved").lte("expires_on", soon).order("expires_on");
    setDocs(data ?? []);
    const ids = [...new Set((data ?? []).map((d: any) => d.application_id))];
    if (ids.length) { const { data: a } = await sb.from("partner_applications").select("id, organization_name, contact_email").in("id", ids); setApps(Object.fromEntries((a ?? []).map((x: any) => [x.id, x]))); }
    const [o, n] = await Promise.all([
      sb.from("organizations").select("id, name, paused_reason").eq("posting_paused", true),
      sb.from("nonprofits").select("id, organization_name, paused_reason").eq("posting_paused", true),
    ]);
    setPaused([...(o.data ?? []).map((x: any) => ({ ...x, kind: "organization" })), ...(n.data ?? []).map((x: any) => ({ ...x, name: x.organization_name, kind: "nonprofit" }))]);
  };
  useEffect(() => { load(); }, []);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Insurance expiring in the next 60 days</CardTitle></CardHeader><CardContent>
        <p className="text-sm text-muted-foreground mb-3">Reminders go out automatically from 30 days before expiry (weekly). Activity pauses automatically when coverage lapses.</p>
        <Table><TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Expires</TableHead><TableHead>Last reminder</TableHead></TableRow></TableHeader><TableBody>
          {docs.map((d) => <TableRow key={d.id}><TableCell>{apps[d.application_id]?.organization_name ?? "—"}</TableCell><TableCell className={d.expires_on < today ? "text-destructive font-medium" : ""}>{d.expires_on}{d.expires_on < today ? " (lapsed)" : ""}</TableCell><TableCell>{d.last_reminder_at ? new Date(d.last_reminder_at).toLocaleDateString() : "—"}</TableCell></TableRow>)}
          {!docs.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nothing expiring soon.</TableCell></TableRow>}
        </TableBody></Table>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Paused accounts</CardTitle></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Reason</TableHead><TableHead /></TableRow></TableHeader><TableBody>
          {paused.map((p) => <TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell className="capitalize">{p.paused_reason?.replace(/_/g, " ") ?? "—"}</TableCell>
            <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => act("clear_pause", { kind: p.kind, id: p.id, mark_verified: p.paused_reason === "ein_status_change" }, "Pause cleared", load)}>Reviewed — clear pause</Button></TableCell></TableRow>)}
          {!paused.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No paused accounts.</TableCell></TableRow>}
        </TableBody></Table>
        <p className="text-xs text-muted-foreground mt-3">Nonprofit exempt status is re-checked every Monday against IRS data; any change pauses donation activity here until reviewed.</p>
      </CardContent></Card>
    </div>
  );
}

function Agreements() {
  const [tpls, setTpls] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ org_kind: "venue", title: "", body: "", scope: "standard", target_id: "" });
  const [targets, setTargets] = useState<{ id: string; name: string; kind: string }[]>([]);
  const load = async () => {
    const { data } = await sb.from("agreement_templates").select("*").order("org_kind").order("version", { ascending: false });
    setTpls(data ?? []);
    const { data: s } = await sb.from("agreement_signatures").select("template_id");
    const c: Record<string, number> = {}; (s ?? []).forEach((x: any) => { c[x.template_id] = (c[x.template_id] ?? 0) + 1; }); setCounts(c);
    const [o, n] = await Promise.all([sb.from("organizations").select("id, name").order("name").limit(1000), sb.from("nonprofits").select("id, organization_name").order("organization_name").limit(1000)]);
    setTargets([...(o.data ?? []).map((x: any) => ({ id: x.id, name: x.name, kind: "organization" })), ...(n.data ?? []).map((x: any) => ({ id: x.id, name: x.organization_name, kind: "nonprofit" }))]);
  };
  useEffect(() => { load(); }, []);

  const readFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) { toast({ title: "Upload a .txt or .md file, or paste the text", variant: "destructive" }); return; }
    setForm((f) => ({ ...f, body: "" })); const text = await file.text(); setForm((f) => ({ ...f, body: text, title: f.title || file.name.replace(/\.(txt|md)$/i, "") }));
  };

  const publish = async () => {
    if (form.title.trim().length < 3 || form.body.trim().length < 50) { toast({ title: "Add a title and the full agreement text", variant: "destructive" }); return; }
    const target = targets.find((t) => t.id === form.target_id);
    if (form.scope === "override" && !target) { toast({ title: "Choose the organization for this override", variant: "destructive" }); return; }
    const scopeCols = form.scope === "override" ? (target!.kind === "nonprofit" ? { nonprofit_id: target!.id } : { organization_id: target!.id }) : {};
    const same = tpls.filter((t) => t.org_kind === form.org_kind && (form.scope === "override" ? (t.organization_id === form.target_id || t.nonprofit_id === form.target_id) : !t.organization_id && !t.nonprofit_id));
    const version = Math.max(0, ...same.map((t) => t.version)) + 1;
    const { data: me } = await supabase.auth.getUser();
    if (same.length) await sb.from("agreement_templates").update({ is_current: false }).in("id", same.map((t) => t.id));
    const { error } = await sb.from("agreement_templates").insert({ org_kind: form.org_kind, title: form.title.trim(), body: form.body, version, is_current: true, created_by: me.user?.id, ...scopeCols });
    if (error) { toast({ title: "Could not publish", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Version ${version} published`, description: "New signers get this version; past signatures keep the version they signed." });
    setForm({ ...form, title: "", body: "" }); load();
  };

  const nameFor = (t: any) => targets.find((x) => x.id === (t.organization_id ?? t.nonprofit_id))?.name;
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Publish a new agreement version</CardTitle></CardHeader><CardContent className="space-y-3 max-w-3xl">
        <div className="flex gap-2 flex-wrap">{(["venue", "nonprofit", "one_time_event"] as OrgKind[]).map((k) => <Button key={k} size="sm" variant={form.org_kind === k ? "default" : "outline"} onClick={() => setForm({ ...form, org_kind: k })}>{KIND_LABEL[k]}</Button>)}</div>
        <div className="flex gap-2"><Button size="sm" variant={form.scope === "standard" ? "default" : "outline"} onClick={() => setForm({ ...form, scope: "standard" })}>Standard template</Button><Button size="sm" variant={form.scope === "override" ? "default" : "outline"} onClick={() => setForm({ ...form, scope: "override" })}>Custom override for one organization</Button></div>
        {form.scope === "override" && <select className="w-full border border-input bg-background rounded-md h-10 px-3" value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })}><option value="">Choose organization…</option>{targets.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.kind})</option>)}</select>}
        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Upload text file (optional)</Label><Input type="file" accept=".txt,.md" onChange={(e) => readFile(e.target.files?.[0])} /></div>
        <div><Label>Agreement text</Label><Textarea rows={12} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
        <Button onClick={publish}>Publish version</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Version history</CardTitle></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Scope</TableHead><TableHead>Version</TableHead><TableHead>Title</TableHead><TableHead>Signed</TableHead><TableHead>Published</TableHead></TableRow></TableHeader><TableBody>
          {tpls.map((t) => <TableRow key={t.id}><TableCell>{KIND_LABEL[t.org_kind as OrgKind]}</TableCell><TableCell>{nameFor(t) ? `Override: ${nameFor(t)}` : "Standard"}</TableCell><TableCell>v{t.version}{t.is_current && <Badge className="ml-2">Current</Badge>}</TableCell><TableCell>{t.title}</TableCell><TableCell>{counts[t.id] ?? 0}</TableCell><TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell></TableRow>)}
        </TableBody></Table>
      </CardContent></Card>
    </div>
  );
}

function Slots() {
  const [slots, setSlots] = useState<any[]>([]);
  useEffect(() => { sb.from("app_config").select("value").eq("key", "partner_document_slots").maybeSingle().then(({ data }: any) => { try { setSlots(data?.value ? JSON.parse(data.value) : []); } catch { setSlots([]); } }); }, []);
  const upd = (i: number, k: string, v: any) => setSlots((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const toggleKind = (i: number, kind: string) => upd(i, "org_kinds", slots[i].org_kinds.includes(kind) ? slots[i].org_kinds.filter((x: string) => x !== kind) : [...slots[i].org_kinds, kind]);
  return (
    <Card><CardHeader><CardTitle>Extra document slots</CardTitle></CardHeader><CardContent className="space-y-4 max-w-3xl">
      <p className="text-sm text-muted-foreground">Certificate of insurance is always required for every applicant. Add other documents here, such as a health permit.</p>
      {slots.map((s, i) => (
        <div key={i} className="border rounded-md p-3 space-y-2">
          <div className="grid sm:grid-cols-2 gap-2"><Input placeholder="Label (e.g. Health permit)" value={s.label} onChange={(e) => { upd(i, "label", e.target.value); upd(i, "key", e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40)); }} />
            <div className="flex gap-3 items-center text-sm"><label className="flex items-center gap-1"><Checkbox checked={s.required} onCheckedChange={(v) => upd(i, "required", !!v)} />Required</label><label className="flex items-center gap-1"><Checkbox checked={s.needs_expiry} onCheckedChange={(v) => upd(i, "needs_expiry", !!v)} />Has expiration date</label></div></div>
          <div className="flex gap-3 text-sm items-center">{(["venue", "nonprofit", "one_time_event"] as OrgKind[]).map((k) => <label key={k} className="flex items-center gap-1"><Checkbox checked={s.org_kinds.includes(k)} onCheckedChange={() => toggleKind(i, k)} />{KIND_LABEL[k]}</label>)}
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSlots(slots.filter((_, j) => j !== i))}>Remove</Button></div>
        </div>
      ))}
      <div className="flex gap-2"><Button variant="outline" onClick={() => setSlots([...slots, { key: "", label: "", required: false, needs_expiry: false, org_kinds: ["venue"] }])}>Add slot</Button>
        <Button onClick={() => act("set_doc_slots", { slots }, "Document slots saved")}>Save</Button></div>
    </CardContent></Card>
  );
}
