import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import SustainabilityBaselineForm, { emptySustainabilityBaseline, type SustainabilityBaselineData } from "@/components/forms/SustainabilityBaselineForm";
import { ORG_CATEGORIES, LOCATION_TYPES, formatOrgType } from "@/lib/constants";
import StatusChip, { toStateAbbr } from "@/components/admin/StatusChip";
import ActionsMenu from "@/components/admin/ActionsMenu";
import type { Organization, ApprovalStatus } from "@/types/database";

// Status colors removed — using StatusChip component

const emptyForm = {
  name: "", type: "food_beverage_group" as any,
  primary_contact_name: "", primary_contact_email: "", primary_contact_phone: "",
  billing_contact: "", address: "", city: "", state: "", zip: "", county: "",
};

export default function Organizations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterState, setFilterState] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [baseline, setBaseline] = useState<SustainabilityBaselineData>(emptySustainabilityBaseline);
  const [showBaseline, setShowBaseline] = useState(false);

  // Bulk import state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkCsvText, setBulkCsvText] = useState<string>("");
  const [bulkPreview, setBulkPreview] = useState<Record<string, string>[]>([]);
  const [bulkDetected, setBulkDetected] = useState<"nonprofits" | "organizations" | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResults, setBulkResults] = useState<Array<{ row: number; organization_name: string; status: string; join_code?: string; reason?: string }> | null>(null);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Organization[];
    },
  });

  const { data: locationCounts = {} } = useQuery({
    queryKey: ["location-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("organization_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((l) => { counts[l.organization_id] = (counts[l.organization_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: pricingOverrides = [] } = useQuery({
    queryKey: ["org-pricing-for-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organization_pricing").select("*");
      if (error) throw error;
      return data as { id: string; organization_id: string; override_amount: number; billing_cycle: string; effective_from: string; effective_to: string | null }[];
    },
  });

  const getOrgPricing = (orgId: string): string => {
    const today = new Date().toISOString().split("T")[0];
    const active = pricingOverrides.find((p) =>
      p.organization_id === orgId && p.effective_from <= today && (!p.effective_to || p.effective_to >= today)
    );
    if (active) return `Custom: $${active.override_amount}/${active.billing_cycle === "monthly" ? "mo" : "yr"}`;
    return "—";
  };

  const saveOrg = useMutation({
    mutationFn: async () => {
      if (editingOrg) {
        const { error } = await supabase.from("organizations").update(form).eq("id", editingOrg.id);
        if (error) throw error;
      } else {
        const { data: newOrg, error } = await supabase.from("organizations").insert([{ ...form, approval_status: "pending" as ApprovalStatus }]).select().single();
        if (error) throw error;
        if (showBaseline && baseline.generates_surplus) {
          const { data: loc, error: locError } = await supabase.from("locations").insert({
            organization_id: newOrg.id, name: form.name + " — Primary",
            address: form.address, city: form.city, state: form.state, zip: form.zip, county: form.county,
          }).select().single();
          if (!locError && loc) {
            const outcomes = [...baseline.priority_outcomes];
            if (baseline.priority_other && outcomes.includes("Other")) outcomes[outcomes.indexOf("Other")] = baseline.priority_other;
            await supabase.from("sustainability_baseline").insert({
              location_id: loc.id, generates_surplus: baseline.generates_surplus,
              estimated_daily_surplus: baseline.estimated_daily_surplus || null,
              surplus_types: baseline.surplus_types.length ? baseline.surplus_types : null,
              current_handling: baseline.current_handling || null,
              donation_frequency: baseline.donation_frequency || null,
              priority_outcomes: outcomes.length ? outcomes : null,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["location-counts"] });
      toast.success(editingOrg ? "Organization updated" : "Organization created");
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditingOrg(null); setForm(emptyForm); setBaseline(emptySustainabilityBaseline); setShowBaseline(false); };

  const openEdit = (org: Organization) => {
    setEditingOrg(org);
    setForm({
      name: org.name, type: org.type,
      primary_contact_name: org.primary_contact_name || "", primary_contact_email: org.primary_contact_email || "",
      primary_contact_phone: org.primary_contact_phone || "", billing_contact: org.billing_contact || "",
      address: org.address || "", city: org.city || "", state: org.state || "", zip: org.zip || "", county: org.county || "",
    });
    setShowBaseline(false);
    setDialogOpen(true);
  };

  const cities = useMemo(() => [...new Set(orgs.map((o) => o.city).filter(Boolean))].sort(), [orgs]);
  const states = useMemo(() => [...new Set(orgs.map((o) => o.state).filter(Boolean))].sort(), [orgs]);

  const filtered = useMemo(() => {
    return orgs.filter((o) => {
      if (search && !o.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && o.type !== filterType) return false;
      if (filterStatus !== "all" && o.approval_status !== filterStatus) return false;
      if (filterCity !== "all" && o.city !== filterCity) return false;
      if (filterState !== "all" && o.state !== filterState) return false;
      return true;
    });
  }, [orgs, search, filterType, filterStatus, filterCity, filterState]);

  const RECOGNIZED_VENUE_TYPES = new Set([
    "venue_events_group","stadium","arena","convention_center","resort","event","hotel",
    "farm","grocery_store","school","festival","corporate_campus","government",
    "restaurant_independent","restaurant_multi_location","franchise",
    "restaurant","cafe","catering_company","food_truck","airport","food_beverage_group",
    "hospitality_group","farm_grocery_group","municipal_government","county_government",
    "state_government","government_entity",
  ]);

  const parseCsvClient = (text: string): Record<string,string>[] => {
    const lines: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') { if (inQ && text[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; cur += c; }
      else if ((c === "\n" || c === "\r") && !inQ) {
        if (c === "\r" && text[i+1] === "\n") i++;
        if (cur.trim().length) lines.push(cur); cur = "";
      } else cur += c;
    }
    if (cur.trim().length) lines.push(cur);
    if (!lines.length) return [];
    const parseLine = (line: string) => {
      const out: string[] = []; let s = "", q = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { if (q && line[i+1] === '"') { s += '"'; i++; } else q = !q; }
        else if (c === "," && !q) { out.push(s); s = ""; } else s += c;
      }
      out.push(s); return out.map(x => x.trim());
    };
    const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/^\ufeff/,"").replace(/\s+/g,"_"));
    return lines.slice(1).map(l => {
      const cells = parseLine(l); const row: Record<string,string> = {};
      headers.forEach((h, i) => row[h] = cells[i] ?? ""); return row;
    });
  };

  const handleBulkFile = async (f: File) => {
    setBulkFile(f); setBulkError(null); setBulkResults(null);
    const text = await f.text();
    setBulkCsvText(text);
    const parsed = parseCsvClient(text);
    setBulkPreview(parsed.slice(0, 3));
    if (!parsed.length) { setBulkDetected(null); setBulkError("CSV appears empty."); return; }
    const types = parsed.map(r => (r.organization_type || "").trim().toLowerCase()).filter(Boolean);
    if (!types.length) { setBulkDetected(null); setBulkError("Missing organization_type column."); return; }
    const hasNonprofit = types.some(t => t === "nonprofit" || t === "nonprofit_organization");
    const hasVenue = types.some(t => RECOGNIZED_VENUE_TYPES.has(t));
    const hasUnknown = types.some(t => t !== "nonprofit" && t !== "nonprofit_organization" && !RECOGNIZED_VENUE_TYPES.has(t));
    if (hasNonprofit && !hasVenue) setBulkDetected("nonprofits");
    else if (hasVenue && !hasNonprofit) setBulkDetected("organizations");
    else if (hasNonprofit && hasVenue) { setBulkDetected("organizations"); }
    else { setBulkDetected(null); }
    if (hasUnknown && !hasVenue && !hasNonprofit) {
      setBulkError("CSV type not recognized. Ensure organization_type contains valid values.");
    }
  };

  const runBulkImport = async () => {
    if (!bulkCsvText || !bulkDetected) return;
    setBulkImporting(true); setBulkError(null);
    try {
      const { callBulkImport } = await import("@/lib/callBulkImport");
      const data = await callBulkImport({ csv_text: bulkCsvText });
      setBulkResults(data?.results ?? []);
      const created = (data?.results ?? []).filter((r: any) => r.status === "created").length;
      const failed = (data?.results ?? []).filter((r: any) => r.status === "failed").length;
      toast.success(`${data?.total ?? 0} rows processed, ${created} created, ${failed} failed`);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["location-counts"] });
      if (failed === 0) {
        setTimeout(() => { closeBulk(); }, 1200);
      }
    } catch (e: any) {
      setBulkError(e?.message || String(e));
      toast.error(e?.message || "Import failed");
    } finally {
      setBulkImporting(false);
    }
  };

  const closeBulk = () => {
    setBulkOpen(false); setBulkFile(null); setBulkCsvText(""); setBulkPreview([]);
    setBulkDetected(null); setBulkError(null); setBulkResults(null); setBulkImporting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all registered organizations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />Bulk Import
          </Button>
          <Button onClick={() => { setEditingOrg(null); setForm(emptyForm); setBaseline(emptySustainabilityBaseline); setShowBaseline(false); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Add Organization
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search organizations..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Filter by type</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]"><Filter className="w-3 h-3 mr-2" /><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ORG_CATEGORIES.filter((t) => t.value !== "nonprofit_organization").map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Filter by status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem><SelectItem value="deactivated">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Filter by city</Label>
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Cities</SelectItem>{cities.map((c) => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Filter by state</Label>
          <Select value={filterState} onValueChange={setFilterState}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All States</SelectItem>{states.map((s) => <SelectItem key={s!} value={s!}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization Name</TableHead><TableHead>Type</TableHead><TableHead>Primary Contact</TableHead>
              <TableHead>Email</TableHead><TableHead>Locations</TableHead><TableHead>Pricing</TableHead><TableHead>Status</TableHead>
              <TableHead>City</TableHead><TableHead>State</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">No organizations found</TableCell></TableRow>
            ) : filtered.map((org) => (
              <TableRow key={org.id} className="cursor-pointer" onClick={() => navigate(`/organizations/${org.id}`)}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>{formatOrgType(org.type)}</TableCell>
                <TableCell>{org.primary_contact_name || "—"}</TableCell>
                <TableCell>{org.primary_contact_email || "—"}</TableCell>
                <TableCell>{locationCounts[org.id] || 0}</TableCell>
                <TableCell className="text-xs">{getOrgPricing(org.id)}</TableCell>
                <TableCell><StatusChip status={org.approval_status} /></TableCell>
                <TableCell>{org.city || "—"}</TableCell>
                <TableCell>{toStateAbbr(org.state)}</TableCell>
                <TableCell>
                  <ActionsMenu
                    entityName={org.name}
                    onView={() => navigate(`/organizations/${org.id}`)}
                    onEdit={() => openEdit(org)}
                    onDelete={() => {}}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Org Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingOrg ? "Edit Organization" : "Add Organization"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Organization Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Organization Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORG_CATEGORIES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact Name</Label><Input value={form.primary_contact_name} onChange={(e) => setForm({ ...form, primary_contact_name: e.target.value })} /></div>
              <div><Label>Contact Email</Label><Input type="email" value={form.primary_contact_email} onChange={(e) => setForm({ ...form, primary_contact_email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact Phone</Label><Input value={form.primary_contact_phone} onChange={(e) => setForm({ ...form, primary_contact_phone: e.target.value })} /></div>
              <div><Label>Billing Contact</Label><Input value={form.billing_contact} onChange={(e) => setForm({ ...form, billing_contact: e.target.value })} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div><Label>ZIP</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div><Label>County</Label><Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} /></div>

            {!editingOrg && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-semibold text-foreground">Sustainability Baseline</p><p className="text-xs text-muted-foreground">Optional — fill out if known</p></div>
                  <Button variant="ghost" size="sm" onClick={() => setShowBaseline(!showBaseline)}>{showBaseline ? "Hide" : "Show"}</Button>
                </div>
                {showBaseline && <SustainabilityBaselineForm data={baseline} onChange={setBaseline} />}
              </>
            )}

            <Button className="w-full" onClick={() => saveOrg.mutate()} disabled={!form.name || saveOrg.isPending}>
              {saveOrg.isPending ? "Saving..." : editingOrg ? "Save Changes" : "Create Organization"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { if (!o) closeBulk(); else setBulkOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bulk Import Organizations</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <label className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {bulkFile ? bulkFile.name : "Choose CSV file"}
              </span>
              <input type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleBulkFile(e.target.files[0])} />
            </label>

            {bulkError && (
              <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
                {bulkError}
              </div>
            )}

            {bulkPreview.length > 0 && !bulkResults && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Detected:</span>
                  {bulkDetected ? (
                    <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 text-xs">
                      {bulkDetected === "nonprofits" ? "Nonprofits" : "Businesses / Organizations"}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-xs">Unknown</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Preview of first 3 rows:</div>
                <div className="border rounded max-h-56 overflow-auto text-xs">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(bulkPreview[0]).slice(0, 6).map((k) => (
                          <TableHead key={k} className="text-xs">{k}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkPreview.map((r, i) => (
                        <TableRow key={i}>
                          {Object.keys(bulkPreview[0]).slice(0, 6).map((k) => (
                            <TableCell key={k} className="text-xs">{r[k]}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {bulkResults && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted rounded p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{bulkResults.length}</p></div>
                  <div className="bg-green-50 rounded p-3"><p className="text-xs text-green-700">Created</p><p className="text-xl font-bold text-green-700">{bulkResults.filter(r => r.status === "created").length}</p></div>
                  <div className="bg-red-50 rounded p-3"><p className="text-xs text-red-700">Failed</p><p className="text-xl font-bold text-red-700">{bulkResults.filter(r => r.status === "failed").length}</p></div>
                </div>
                <div className="max-h-56 overflow-auto text-sm border rounded p-2">
                  {bulkResults.map((r) => (
                    <div key={r.row} className="flex items-center gap-2 py-1 border-b last:border-0">
                      {r.status === "created" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                      <span className="w-8 text-muted-foreground">#{r.row}</span>
                      <span className="flex-1 font-medium truncate">{r.organization_name}</span>
                      {r.join_code && <code className="text-xs bg-muted px-2 py-0.5 rounded">{r.join_code}</code>}
                      {r.reason && <span className="text-xs text-red-600 truncate max-w-[220px]">{r.reason}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeBulk} disabled={bulkImporting}>
                {bulkResults ? "Close" : "Cancel"}
              </Button>
              {!bulkResults && (
                <Button onClick={runBulkImport} disabled={!bulkDetected || bulkImporting || !!bulkError}>
                  {bulkImporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</> : "Import"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
