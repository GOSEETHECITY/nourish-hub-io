import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Order = {
  id: string;
  created_at: string;
  status: string;
  quantity: number;
  total_price: number;
  application_fee_cents: number;
  venue_payout_cents: number;
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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
      if (!profile?.organization_id) { setLoading(false); return; }
      const { data } = await supabase
        .from("consumer_orders")
        .select("id, created_at, status, quantity, total_price, application_fee_cents, venue_payout_cents, stripe_payment_intent_id, coupon_id, food_listing_id, refunded_at")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(200);
      setOrders((data ?? []) as Order[]);
      setLoading(false);
    })();
  }, [user]);

  const totals = orders.reduce(
    (acc, o) => {
      if (o.status === "paid" || o.status === "picked_up") {
        acc.gross += Number(o.total_price ?? 0);
        acc.payout += Number(o.venue_payout_cents ?? 0) / 100;
        acc.fee += Number(o.application_fee_cents ?? 0) / 100;
      }
      return acc;
    },
    { gross: 0, payout: 0, fee: 0 },
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-muted-foreground">Paid marketplace and flash-rescue transactions for your organization.</p>
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
                  <TableHead>Fee</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell>{new Date(o.created_at).toLocaleString()}</TableCell>
                    <TableCell>{o.food_listing_id ? "Flash" : "Marketplace"}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell>${Number(o.total_price ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{cents(o.application_fee_cents)}</TableCell>
                    <TableCell>{cents(o.venue_payout_cents)}</TableCell>
                    <TableCell>
                      <Badge variant={o.refunded_at ? "destructive" : o.status === "paid" ? "default" : "secondary"}>
                        {o.refunded_at ? "refunded" : o.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
