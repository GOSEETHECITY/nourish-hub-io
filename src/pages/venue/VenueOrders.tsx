import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

type Order = {
  id: string;
  created_at: string;
  status: string;
  quantity: number;
  total_price: number;
  application_fee_cents: number;
  venue_payout_cents: number;
  pickup_code: string | null;
  stripe_payment_intent_id: string | null;
  coupon_id: string | null;
  food_listing_id: string | null;
  refunded_at: string | null;
};

const cents = (c: number) => `$${(Number(c ?? 0) / 100).toFixed(2)}`;

export default function VenueOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickupOrder, setPickupOrder] = useState<Order | null>(null);
  const [pickupInput, setPickupInput] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
    if (!profile?.organization_id) { setLoading(false); return; }
    const { data } = await supabase
      .from("consumer_orders")
      .select("id, created_at, status, quantity, total_price, application_fee_cents, venue_payout_cents, pickup_code, stripe_payment_intent_id, coupon_id, food_listing_id, refunded_at")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })
      .limit(200);
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const markReady = async (o: Order) => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("mark-order-picked-up", { body: { order_id: o.id, action: "ready" } });
    setBusy(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Marked ready", description: "Customer has been notified." });
    load();
  };

  const confirmPickup = async () => {
    if (!pickupOrder) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("mark-order-picked-up", {
      body: { order_id: pickupOrder.id, pickup_code: pickupInput.trim().toUpperCase() },
    });
    setBusy(false);
    if (error || data?.error) { toast({ title: "Code did not match", description: data?.error || error?.message, variant: "destructive" }); return; }
    toast({ title: "Order marked picked up" });
    setPickupOrder(null); setPickupInput(""); load();
  };

  const totals = orders.reduce((acc, o) => {
    if (o.status === "paid" || o.status === "ready" || o.status === "picked_up") {
      acc.gross += Number(o.total_price ?? 0);
      acc.payout += Number(o.venue_payout_cents ?? 0) / 100;
      acc.fee += Number(o.application_fee_cents ?? 0) / 100;
    }
    return acc;
  }, { gross: 0, payout: 0, fee: 0 });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-muted-foreground">Consumer orders with pickup codes and fulfillment status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Gross sales</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">${totals.gross.toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Platform fees</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">${totals.fee.toFixed(2)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Your payout</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">${totals.payout.toFixed(2)}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent orders</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-muted-foreground">Loading…</div> : orders.length === 0 ? (
            <div className="text-muted-foreground">No orders yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pickup Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs">{new Date(o.created_at).toLocaleString()}</TableCell>
                    <TableCell>{o.food_listing_id ? "Flash" : "Marketplace"}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell>${Number(o.total_price ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{o.pickup_code ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono tracking-widest">{o.pickup_code}</code> : "—"}</TableCell>
                    <TableCell><Badge variant={o.refunded_at ? "destructive" : o.status === "picked_up" ? "default" : "secondary"}>{o.refunded_at ? "refunded" : o.status?.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-right space-x-2">
                      {(o.status === "paid") && <Button size="sm" variant="outline" onClick={() => markReady(o)} disabled={busy}>Mark Ready</Button>}
                      {(o.status === "paid" || o.status === "ready") && <Button size="sm" onClick={() => { setPickupOrder(o); setPickupInput(""); }}>Mark Picked Up</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!pickupOrder} onOpenChange={(o) => !o && setPickupOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verify pickup code</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Ask the customer to show their 6-character pickup code and enter it below.</p>
          <Input placeholder="Pickup code" value={pickupInput} onChange={(e) => setPickupInput(e.target.value.toUpperCase())} maxLength={6} className="tracking-[0.3em] text-center text-lg font-bold" />
          <Button onClick={confirmPickup} disabled={busy || pickupInput.length !== 6}>Confirm pickup</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
