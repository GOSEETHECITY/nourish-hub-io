import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import StatusChip from "@/components/admin/StatusChip";
import ActionsMenu from "@/components/admin/ActionsMenu";
import type { Organization } from "@/types/database";

interface OrgPricing {
  id: string;
  organization_id: string;
  override_amount: number;
  override_currency: string;
  billing_cycle: "monthly" | "annual";
  notes: string | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

const emptyForm = {
  organization_id: "",
  override_amount: "",
  billing_cycle: "monthly" as "monthly" | "annual",
  effective_from: new Date().toISOString().split("T")[0],
  effective_to: "",
  notes: "",
};

function getOverrideStatus(o: OrgPricing): string {
  const today = new Date().toISOString().split("T")[0];
  if (o.effective_to && o.effective_to < today) return "expired";
  if (o.effective_from > today) return "scheduled";
  return "active";
}

export default function OrganizationOverrides() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterCycle, setFilterCycle] = useState("all");

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ["org-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_pricing")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrgPricing[];
    },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("id, name");
      return (data || []) as Pick<Organization, "id" | "name">[];
    },
  });

  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o.name])), [orgs]);

  const saveOverride = useMutation({
    mutationFn: async () => {
      const payload = {
        organization_id: form.organization_id,
        override_amount: Number(form.override_amount),
        billing_cycle: form.billing_cycle,
        effective_from: form.effective_from,
        effective_to: form.effective_to || null,
        notes: form.notes || null,
      };
      if (editingId) {
        const { error } = await supabase.from("organization_pricing").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("organization_pricing").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-pricing"] });
      toast.success(editingId ? "Override updated" : "Override created");
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteOverride = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organization_pricing").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-pricing"] });
      toast.success("Override deleted");
    },
  });

  const endOverride = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organization_pricing")
        .update({ effective_to: new Date().toISOString().split("T")[0] })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-pricing"] });
      toast.success("Override ended");
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (o: OrgPricing) => {
    setEditingId(o.id);
    setForm({
      organization_id: o.organization_id,
      override_amount: o.override_amount.toString(),
      billing_cycle: o.billing_cycle,
      effective_from: o.effective_from,
      effective_to: o.effective_to || "",
      notes: o.notes || "",
    });
    setDialogOpen(true);
  };

  const filtered = useMemo(() => {
    let result = overrides;
    if (filterCycle !== "all") result = result.filter((o) => o.billing_cycle === filterCycle);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) => (orgMap[o.organization_id] || "").toLowerCase().includes(q));
    }
    return result;
  }, [overrides, filterCycle, search, orgMap]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Per-organization pricing overrides</p>
        <Button size="sm" onClick={() => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Add Override
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by organization..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Filter by Billing Cycle</Label>
          <Select value={filterCycle} onValueChange={setFilterCycle}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Override Amount</TableHead>
              <TableHead>Billing Cycle</TableHead>
              <TableHead>Effective From</TableHead>
              <TableHead>Effective To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No pricing overrides found</TableCell></TableRow>
            ) : filtered.map((o) => {
              const status = getOverrideStatus(o);
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{orgMap[o.organization_id] || "—"}</TableCell>
                  <TableCell>${o.override_amount.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{o.billing_cycle}</TableCell>
                  <TableCell>{new Date(o.effective_from).toLocaleDateString()}</TableCell>
                  <TableCell>{o.effective_to ? new Date(o.effective_to).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><StatusChip status={status} /></TableCell>
                  <TableCell>
                    <ActionsMenu
                      entityName={orgMap[o.organization_id] || "Override"}
                      onEdit={() => openEdit(o)}
                      onDelete={() => deleteOverride.mutate(o.id)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Edit Override" : "Add Override"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Organization *</Label>
              <Select value={form.organization_id} onValueChange={(v) => setForm({ ...form, organization_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Override Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input className="pl-7" type="number" value={form.override_amount} onChange={(e) => setForm({ ...form, override_amount: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Billing Cycle *</Label>
              <Select value={form.billing_cycle} onValueChange={(v) => setForm({ ...form, billing_cycle: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Effective From *</Label><Input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} /></div>
              <div><Label>Effective To</Label><Input type="date" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button className="w-full" onClick={() => saveOverride.mutate()} disabled={!form.organization_id || !form.override_amount || saveOverride.isPending}>
              {saveOverride.isPending ? "Saving..." : editingId ? "Save Changes" : "Add Override"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
