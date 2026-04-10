import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import StatusChip, { toStateAbbr } from "@/components/admin/StatusChip";
import ActionsMenu from "@/components/admin/ActionsMenu";
import type { Nonprofit, ApprovalStatus } from "@/types/database";

const emptyForm = {
  organization_name: "", ein: "", website: "", primary_contact: "",
  address: "", city: "", state: "", zip: "", county: "",
  operating_hours: "", cold_storage: false, refrigeration: false, cabinetry: false,
  estimated_weekly_served: 0, population_served: "",
};

export default function Nonprofits() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNp, setEditingNp] = useState<Nonprofit | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const { data: nonprofits = [], isLoading } = useQuery({
    queryKey: ["nonprofits"],
    queryFn: async () => { const { data, error } = await supabase.from("nonprofits").select("*").order("created_at", { ascending: false }); if (error) throw error; return data as Nonprofit[]; },
  });

  const saveNonprofit = useMutation({
    mutationFn: async () => {
      if (editingNp) { const { error } = await supabase.from("nonprofits").update(form).eq("id", editingNp.id); if (error) throw error; }
      else { const { error } = await supabase.from("nonprofits").insert({ ...form, approval_status: "pending" as ApprovalStatus }); if (error) throw error; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["nonprofits"] }); toast.success(editingNp ? "Nonprofit updated" : "Nonprofit added"); closeDialog(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteNonprofit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nonprofits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["nonprofits"] }); toast.success("Nonprofit deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const closeDialog = () => { setDialogOpen(false); setEditingNp(null); setForm(emptyForm); };

  const openEdit = (np: Nonprofit) => {
    setEditingNp(np);
    setForm({
      organization_name: np.organization_name, ein: np.ein || "", website: np.website || "",
      primary_contact: np.primary_contact || "", address: np.address || "", city: np.city || "",
      state: np.state || "", zip: np.zip || "", county: np.county || "",
      operating_hours: np.operating_hours || "", cold_storage: np.cold_storage, refrigeration: np.refrigeration,
      cabinetry: np.cabinetry, estimated_weekly_served: np.estimated_weekly_served || 0,
      population_served: np.population_served || "",
    });
    setDialogOpen(true);
  };

  const cities = useMemo(() => [...new Set(nonprofits.map((n) => n.city).filter(Boolean))].sort(), [nonprofits]);

  const filtered = useMemo(() => {
    return nonprofits.filter((n) => {
      if (filterStatus !== "all" && n.approval_status !== filterStatus) return false;
      if (filterCity !== "all" && n.city !== filterCity) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (![n.organization_name, n.primary_contact, n.city].filter(Boolean).some((f) => f!.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [nonprofits, filterStatus, filterCity, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Nonprofits</h1><p className="text-sm text-muted-foreground mt-1">Manage nonprofit partner applications and approvals</p></div>
        <Button onClick={() => { setEditingNp(null); setForm(emptyForm); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Nonprofit</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search nonprofits..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Filter by status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="deactivated">Deactivated</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Filter by city</Label>
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Cities</SelectItem>{cities.map((c) => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Organization Name</TableHead><TableHead>Primary Contact</TableHead><TableHead>City</TableHead><TableHead>State</TableHead><TableHead>County</TableHead><TableHead>Status</TableHead><TableHead>Date Applied</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No nonprofits found</TableCell></TableRow>
            : filtered.map((n) => (
              <TableRow key={n.id} className="cursor-pointer" onClick={() => navigate(`/nonprofits/${n.id}`)}>
                <TableCell className="font-medium">{n.organization_name}</TableCell>
                <TableCell>{n.primary_contact || "—"}</TableCell>
                <TableCell>{n.city || "—"}</TableCell>
                <TableCell>{toStateAbbr(n.state)}</TableCell>
                <TableCell>{n.county || "—"}</TableCell>
                <TableCell><StatusChip status={n.approval_status} /></TableCell>
                <TableCell>{new Date(n.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <ActionsMenu
                    entityName={n.organization_name}
                    onView={() => navigate(`/nonprofits/${n.id}`)}
                    onEdit={() => { openEdit(n); }}
                    onDelete={() => deleteNonprofit.mutate(n.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingNp ? "Edit Nonprofit" : "Add Nonprofit"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Organization Name *</Label><Input value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>EIN</Label><Input value={form.ein} onChange={(e) => setForm({ ...form, ein: e.target.value })} /></div>
              <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
            </div>
            <div><Label>Primary Contact</Label><Input value={form.primary_contact} onChange={(e) => setForm({ ...form, primary_contact: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div><Label>ZIP</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div><Label>County</Label><Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} /></div>
            <div><Label>Operating Hours</Label><Input value={form.operating_hours} onChange={(e) => setForm({ ...form, operating_hours: e.target.value })} /></div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.cold_storage} onCheckedChange={(v) => setForm({ ...form, cold_storage: !!v })} />Cold Storage</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.refrigeration} onCheckedChange={(v) => setForm({ ...form, refrigeration: !!v })} />Refrigeration</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.cabinetry} onCheckedChange={(v) => setForm({ ...form, cabinetry: !!v })} />Cabinetry</label>
            </div>
            <div><Label>Population Served</Label><Input value={form.population_served} onChange={(e) => setForm({ ...form, population_served: e.target.value })} /></div>
            <Button className="w-full" onClick={() => saveNonprofit.mutate()} disabled={!form.organization_name || saveNonprofit.isPending}>
              {saveNonprofit.isPending ? "Saving..." : editingNp ? "Save Changes" : "Create Nonprofit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
