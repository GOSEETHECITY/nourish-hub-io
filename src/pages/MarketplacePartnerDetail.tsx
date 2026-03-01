import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, AlertTriangle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { Organization, Location, Coupon, CouponStatus } from "@/types/database";
import { useState } from "react";

export default function MarketplacePartnerDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: org } = useQuery({
    queryKey: ["mp-org", orgId],
    queryFn: async () => { const { data } = await supabase.from("organizations").select("*").eq("id", orgId!).single(); return data as Organization; },
    enabled: !!orgId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["mp-locs", orgId],
    queryFn: async () => { const { data } = await supabase.from("locations").select("*").eq("organization_id", orgId!); return (data || []) as Location[]; },
    enabled: !!orgId,
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ["mp-coupons", orgId],
    queryFn: async () => {
      const locIds = locations.map((l) => l.id);
      if (!locIds.length) return [];
      const { data } = await supabase.from("coupons").select("*").in("location_id", locIds);
      return (data || []) as Coupon[];
    },
    enabled: locations.length > 0,
  });

  const toggleMarketplace = useMutation({
    mutationFn: async ({ locId, enabled }: { locId: string; enabled: boolean }) => {
      const { error } = await supabase.from("locations").update({ marketplace_enabled: enabled }).eq("id", locId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mp-locs", orgId] }); toast.success("Updated"); },
  });

  const updateFee = useMutation({
    mutationFn: async ({ locId, fee }: { locId: string; fee: number }) => {
      const { error } = await supabase.from("locations").update({ platform_fee_percentage: fee }).eq("id", locId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mp-locs", orgId] }); toast.success("Fee updated"); },
  });

  const killCoupon = useMutation({
    mutationFn: async (couponId: string) => {
      const { error } = await supabase.from("coupons").update({ status: "taken_down" as CouponStatus }).eq("id", couponId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["mp-coupons", orgId] }); toast.success("Coupon taken down"); },
  });

  if (!org) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/marketplace")}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-2xl font-bold text-foreground">{org.name} — Marketplace</h1>
      </div>

      {/* Locations */}
      {locations.map((loc) => {
        const locCoupons = coupons.filter((c) => c.location_id === loc.id);
        const revenue = locCoupons.reduce((s, c) => s + c.price * c.quantity_sold, 0);
        const fee = revenue * loc.platform_fee_percentage / 100;
        const isPending = loc.marketplace_enabled && loc.stripe_onboarding_status !== "complete";

        return (
          <div key={loc.id} className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">{loc.name}</h3>
                <p className="text-sm text-muted-foreground">{[loc.address, loc.city, loc.state].filter(Boolean).join(", ")}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Marketplace</span>
                  <Switch checked={loc.marketplace_enabled} onCheckedChange={(v) => toggleMarketplace.mutate({ locId: loc.id, enabled: v })} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div><p className="text-xs text-muted-foreground">Stripe Status</p><p className="text-sm font-medium text-foreground mt-1">{loc.stripe_onboarding_status || "Not started"}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">Platform Fee %</p>
                <Input type="number" className="mt-1 w-24" defaultValue={loc.platform_fee_percentage} onBlur={(e) => updateFee.mutate({ locId: loc.id, fee: Number(e.target.value) })} />
              </div>
              <div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-sm font-bold text-foreground mt-1">${revenue.toFixed(2)}</p></div>
              <div><p className="text-xs text-muted-foreground">Fee Earned / Payout</p><p className="text-sm text-foreground mt-1">${fee.toFixed(2)} / ${(revenue - fee).toFixed(2)}</p></div>
            </div>

            {isPending && (
              <div className="bg-chart-4/10 border border-chart-4/30 rounded-lg p-4 flex items-center justify-between">
                <p className="text-sm text-foreground">🟡 Stripe setup incomplete. Venue needs to complete onboarding.</p>
                <Button size="sm" variant="outline" onClick={() => toast.info("Email notification coming soon. Connect email API to activate.")}><Mail className="w-4 h-4 mr-2" />Send Nudge</Button>
              </div>
            )}

            {locCoupons.length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Price</TableHead><TableHead>Sold</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {locCoupons.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell>${c.price.toFixed(2)}</TableCell>
                      <TableCell>{c.quantity_sold} / {c.quantity_available}</TableCell>
                      <TableCell className="capitalize">{c.status.replace(/_/g, " ")}</TableCell>
                      <TableCell>{c.status !== "taken_down" && <Button size="sm" variant="destructive" onClick={() => killCoupon.mutate(c.id)}><AlertTriangle className="w-3 h-3 mr-1" />Kill</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })}
    </div>
  );
}
