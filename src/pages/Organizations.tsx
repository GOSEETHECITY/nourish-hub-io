import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import SustainabilityBaselineForm, { emptySustainabilityBaseline, type SustainabilityBaselineData } from "@/components/forms/SustainabilityBaselineForm";
import type { Organization, OrganizationType, ApprovalStatus } from "@/types/database";

const ORG_TYPES: { value: OrganizationType; label: string }[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "catering_company", label: "Catering Company" },
  { value: "event", label: "Event" },
  { value: "hotel", label: "Hotel" },
  { value: "convention_center", label: "Convention Center" },
  { value: "stadium", label: "Stadium" },
  { value: "arena", label: "Arena" },
  { value: "farm", label: "Farm" },
  { value: "grocery_store", label: "Grocery Store" },
  { value: "food_truck", label: "Food Truck" },
  { value: "airport", label: "Airport" },
  { value: "festival", label: "Festival" },
  { value: "municipal_government", label: "Municipal Government" },
  { value: "county_government", label: "County Government" },
  { value: "state_government", label: "State Government" },
];

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: "bg-chart-4/15 text-chart-4",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  deactivated: "bg-muted text-muted-foreground",
};

const emptyForm = {
  name: "", type: "restaurant" as OrganizationType,
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

  const saveOrg = useMutation({
    mutationFn: async () => {
      if (editingOrg) {
        const { error } = await supabase.from("organizations").update(form).eq("id", editingOrg.id);
        if (error) throw error;
      } else {
        // Create org
        const { data: newOrg, error } = await supabase.from("organizations").insert({ ...form, approval_status: "pending" as ApprovalStatus }).select().single();
        if (error) throw error;

        // If baseline data filled, create a location and baseline
        if (showBaseline && baseline.generates_surplus) {
          const { data: loc, error: locError } = await supabase.from("locations").insert({
            organization_id: newOrg.id,
            name: form.name + " — Primary",
            address: form.address, city: form.city, state: form.state, zip: form.zip, county: form.county,
          }).select().single();
          if (!locError && loc) {
            const outcomes = [...baseline.priority_outcomes];
            if (baseline.priority_other && outcomes.includes("Other")) {
              const idx = outcomes.indexOf("Other");
              outcomes[idx] = baseline.priority_other;
            }
            await supabase.from("sustainability_baseline").insert({
              location_id: loc.id,
              generates_surplus: baseline.generates_surplus,
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

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingOrg(null);
    setForm(emptyForm);
    setBaseline(emptySustainabilityBaseline);
    setShowBaseline(false);
  };

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

  const formatType = (t: string) => t.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all registered organizations</p>
        </div>
        <Button onClick={() => { setEditingOrg(null); setForm(emptyForm); setBaseline(emptySustainabilityBaseline); setShowBaseline(false); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Add Organization
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search organizations..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><Filter className="w-3 h-3 mr-2" /><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ORG_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="City" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((c) => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterState} onValueChange={setFilterState}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {states.map((s) => <SelectItem key={s!} value={s!}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Primary Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>City</TableHead>
              <TableHead>State</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No organizations found</TableCell></TableRow>
            ) : (
              filtered.map((org) => (
                <TableRow key={org.id} className="cursor-pointer" onClick={() => navigate(`/organizations/${org.id}`)}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{formatType(org.type)}</TableCell>
                  <TableCell>{org.primary_contact_name || "—"}</TableCell>
                  <TableCell>{org.primary_contact_email || "—"}</TableCell>
                  <TableCell>{locationCounts[org.id] || 0}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${STATUS_COLORS[org.approval_status]}`}>
                      {org.approval_status}
                    </span>
                  </TableCell>
                  <TableCell>{org.city || "—"}</TableCell>
                  <TableCell>{org.state || "—"}</TableCell>
                </TableRow>
              ))
            )}
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
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as OrganizationType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORG_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
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

            {/* Sustainability Baseline (only for new orgs) */}
            {!editingOrg && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Sustainability Baseline</p>
                    <p className="text-xs text-muted-foreground">Optional — fill out if known</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowBaseline(!showBaseline)}>
                    {showBaseline ? "Hide" : "Show"}
                  </Button>
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
    </div>
  );
}
