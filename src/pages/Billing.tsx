import { useState, useMemo } from "react";
import { CreditCard } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import StatusChip from "@/components/admin/StatusChip";
import OrganizationOverrides from "@/components/billing/OrganizationOverrides";
import type { BillingRecord, Organization, BillingCycle, PaymentStatus } from "@/types/database";

export default function Billing() {
  const queryClient = useQueryClient();
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterCycle, setFilterCycle] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BillingRecord>>({});

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["billing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("billing").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as BillingRecord[];
    },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => { const { data } = await supabase.from("organizations").select("id, name, type"); return (data || []) as Pick<Organization, "id" | "name" | "type">[]; },
  });

  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);

  const updateBilling = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await supabase.from("billing").update(editForm).eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      toast.success("Billing updated");
      setEditingId(null);
    },
  });

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterPayment !== "all" && r.payment_status !== filterPayment) return false;
      if (filterCycle !== "all" && r.billing_cycle !== filterCycle) return false;
      return true;
    });
  }, [records, filterPayment, filterCycle]);

  const formatType = (t: string) => t.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Organization billing and subscription management</p>
      </div>

      <Tabs defaultValue="billing" className="w-full">
        <TabsList>
          <TabsTrigger value="billing">Billing Records</TabsTrigger>
          <TabsTrigger value="overrides">Organization Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Filter by Status</Label>
              <Select value={filterPayment} onValueChange={setFilterPayment}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Payment Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem><SelectItem value="free">Free</SelectItem></SelectContent></Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Filter by Plan</Label>
              <Select value={filterCycle} onValueChange={setFilterCycle}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Billing Cycle" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="free">Free</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent></Select>
            </div>
          </div>

          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Next Billing</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No billing records found</TableCell></TableRow>
                ) : filtered.map((r) => {
                  const org = orgMap[r.organization_id];
                  const isEditing = editingId === r.id;

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{org?.name || "—"}</TableCell>
                      <TableCell>{org ? formatType(org.type) : "—"}</TableCell>
                      <TableCell>{isEditing ? <Input type="number" className="w-24" defaultValue={r.assigned_price ?? ""} onChange={(e) => setEditForm({ ...editForm, assigned_price: Number(e.target.value) })} /> : r.assigned_price != null ? `$${r.assigned_price}` : "—"}</TableCell>
                      <TableCell>{isEditing ? (
                        <Select defaultValue={r.billing_cycle} onValueChange={(v) => setEditForm({ ...editForm, billing_cycle: v as BillingCycle })}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="free">Free</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent>
                        </Select>
                      ) : <span className="capitalize">{r.billing_cycle}</span>}</TableCell>
                      <TableCell>{isEditing ? (
                        <Select defaultValue={r.payment_status} onValueChange={(v) => setEditForm({ ...editForm, payment_status: v as PaymentStatus })}>
                          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem><SelectItem value="free">Free</SelectItem></SelectContent>
                        </Select>
                      ) : <StatusChip status={r.payment_status} />}</TableCell>
                      <TableCell>{r.next_billing_date ? new Date(r.next_billing_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{isEditing ? <Input defaultValue={r.notes || ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /> : r.notes || "—"}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateBilling.mutate()}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => { setEditingId(r.id); setEditForm({}); }}>Edit</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="bg-muted/50 rounded-xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2"><CreditCard className="w-4 h-4" /> Stripe Billing integration placeholder — ready for future activation</p>
          </div>
        </TabsContent>

        <TabsContent value="overrides" className="mt-4">
          <OrganizationOverrides />
        </TabsContent>
      </Tabs>
    </div>
  );
}
