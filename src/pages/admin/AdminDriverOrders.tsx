import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const db = supabase as any;
const STATUSES = ["awaiting_payment", "paid", "dispatched", "completed", "cancelled"];
const label = (s: string) => s.replace(/_/g, " ");

export default function AdminDriverOrders() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("open");
  const [links, setLinks] = useState<Record<string, string>>({});

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-driver-orders"],
    queryFn: async () => (await db.from("driver_orders").select("*").order("created_at", { ascending: false }).limit(500)).data || [],
  });
  const npIds = useMemo(() => [...new Set(orders.map((o: any) => o.nonprofit_id))], [orders]);
  const { data: nps = [] } = useQuery({
    queryKey: ["admin-driver-nps", npIds],
    queryFn: async () => (await supabase.from("nonprofits").select("id, organization_name").in("id", npIds as string[])).data || [],
    enabled: npIds.length > 0,
  });
  const npName = Object.fromEntries((nps as any[]).map((n) => [n.id, n.organization_name]));

  const shown = orders.filter((o: any) => filter === "all" || (filter === "open" ? ["paid", "dispatched"].includes(o.status) : o.status === filter));

  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await db.from("driver_orders").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-driver-orders"] });
    toast.success("Order updated");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Driver Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Paid nonprofit driver requests waiting for fulfillment. DoorDash orders are booked manually; Uber orders use the Uber link once the partnership link is available.</p>
      </div>
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Needs fulfillment</SelectItem>
          <SelectItem value="all">All orders</SelectItem>
          {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{label(s)}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="bg-card rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nonprofit</TableHead><TableHead>Type</TableHead><TableHead>Service</TableHead><TableHead>Date</TableHead>
            <TableHead>Fee</TableHead><TableHead>Status</TableHead><TableHead>Fulfillment</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No driver orders here.</TableCell></TableRow>
            ) : shown.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{npName[o.nonprofit_id] || "—"}</TableCell>
                <TableCell className="capitalize">{o.pickup_kind === "monthly_bulk" ? "Monthly bulk" : "One-time"}</TableCell>
                <TableCell>{o.provider === "uber" ? "Uber" : "DoorDash"}</TableCell>
                <TableCell>{o.scheduled_date || new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell>${(o.estimated_fee_cents / 100).toFixed(2)}</TableCell>
                <TableCell className="capitalize">{label(o.status)}</TableCell>
                <TableCell className="min-w-[220px]">
                  {o.provider === "doordash" ? (
                    <span className="text-xs text-muted-foreground">Manual booking by admin</span>
                  ) : o.uber_deeplink ? (
                    <a className="text-xs text-primary underline" href={o.uber_deeplink} target="_blank" rel="noopener noreferrer">Open Uber link</a>
                  ) : (
                    <div className="flex gap-1">
                      <Input className="h-8 text-xs" placeholder="Uber link (pending partnership)" value={links[o.id] ?? ""} onChange={(e) => setLinks({ ...links, [o.id]: e.target.value })} />
                      <Button size="sm" variant="outline" disabled={!/^https:\/\//.test(links[o.id] ?? "")} onClick={() => update(o.id, { uber_deeplink: links[o.id] })}>Save</Button>
                    </div>
                  )}
                  {o.pickup_notes && <p className="text-xs text-muted-foreground mt-1">Notes: {o.pickup_notes}</p>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    {o.status === "paid" && <Button size="sm" onClick={() => update(o.id, { status: "dispatched", dispatched_at: new Date().toISOString() })}>Mark dispatched</Button>}
                    {o.status === "dispatched" && <Button size="sm" onClick={() => update(o.id, { status: "completed", completed_at: new Date().toISOString() })}>Mark completed</Button>}
                    {["awaiting_payment", "paid", "dispatched"].includes(o.status) && <Button size="sm" variant="ghost" onClick={() => update(o.id, { status: "cancelled" })}>Cancel</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
