import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Coupon, Organization, Location, CouponStatus } from "@/types/database";

export default function CouponDetail() {
  const { couponId } = useParams<{ couponId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Partial<Coupon>>({});

  const { data: coupon } = useQuery({
    queryKey: ["coupon", couponId],
    queryFn: async () => { const { data, error } = await supabase.from("coupons").select("*").eq("id", couponId!).single(); if (error) throw error; return data as Coupon; },
    enabled: !!couponId,
  });

  const { data: org } = useQuery({
    queryKey: ["org-coupon", coupon?.organization_id],
    queryFn: async () => { const { data } = await supabase.from("organizations").select("*").eq("id", coupon!.organization_id).single(); return data as Organization; },
    enabled: !!coupon?.organization_id,
  });

  const { data: loc } = useQuery({
    queryKey: ["loc-coupon", coupon?.location_id],
    queryFn: async () => { const { data } = await supabase.from("locations").select("*").eq("id", coupon!.location_id).single(); return data as Location; },
    enabled: !!coupon?.location_id,
  });

  const killCoupon = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("coupons").update({ status: "taken_down" as CouponStatus }).eq("id", couponId!); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["coupon", couponId] }); toast.success("Coupon taken down"); },
  });

  const updateCoupon = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("coupons").update(form).eq("id", couponId!); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["coupon", couponId] }); toast.success("Coupon updated"); setEditOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = () => {
    if (!coupon) return;
    setForm({
      title: coupon.title, description: coupon.description, price: coupon.price,
      original_price: coupon.original_price, quantity_available: coupon.quantity_available,
      pickup_address: coupon.pickup_address,
    });
    setEditOpen(true);
  };

  if (!coupon) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;

  const totalRevenue = coupon.price * coupon.quantity_sold;
  const feePercent = loc?.platform_fee_percentage || 0;
  const platformFee = totalRevenue * feePercent / 100;
  const venuePayout = totalRevenue - platformFee;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-2xl font-bold text-foreground flex-1">Coupon Detail</h1>
        <Button size="sm" variant="outline" onClick={openEdit}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
        {coupon.status !== "taken_down" && (
          <Button variant="destructive" onClick={() => killCoupon.mutate()}><AlertTriangle className="w-4 h-4 mr-2" />Take Down</Button>
        )}
      </div>

      <div className="bg-card rounded-xl border p-6">
        {coupon.photo_url && <img src={coupon.photo_url} alt={coupon.title} className="w-64 h-48 rounded-lg object-cover mb-6" />}
        <div className="grid grid-cols-3 gap-6">
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Title</p><p className="text-sm font-medium text-foreground mt-1">{coupon.title}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Organization</p><p className="text-sm text-foreground mt-1">{org?.name || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Location</p><p className="text-sm text-foreground mt-1">{loc?.name || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Price</p><p className="text-sm text-foreground mt-1">${coupon.price.toFixed(2)}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Original Price</p><p className="text-sm text-foreground mt-1">{coupon.original_price ? `$${coupon.original_price.toFixed(2)}` : "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p><p className="text-sm font-medium text-foreground mt-1 capitalize">{coupon.status.replace(/_/g, " ")}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Active Dates</p><p className="text-sm text-foreground mt-1">{coupon.coupon_active_start ? `${new Date(coupon.coupon_active_start).toLocaleDateString()} – ${coupon.coupon_active_end ? new Date(coupon.coupon_active_end).toLocaleDateString() : "Ongoing"}` : "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pickup Address</p><p className="text-sm text-foreground mt-1">{coupon.pickup_address || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Coordinates</p><p className="text-sm text-foreground mt-1">{coupon.latitude && coupon.longitude ? `${coupon.latitude}, ${coupon.longitude}` : "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Qty Available</p><p className="text-sm text-foreground mt-1">{coupon.quantity_available}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Qty Sold</p><p className="text-sm text-foreground mt-1">{coupon.quantity_sold}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Qty Remaining</p><p className="text-sm text-foreground mt-1">{coupon.quantity_remaining}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Date Posted</p><p className="text-sm text-foreground mt-1">{new Date(coupon.created_at).toLocaleString()}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Description</p><p className="text-sm text-foreground mt-1">{coupon.description || "—"}</p></div>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Revenue</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold text-foreground mt-1">${totalRevenue.toFixed(2)}</p></div>
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Platform Fee ({feePercent}%)</p><p className="text-2xl font-bold text-foreground mt-1">${platformFee.toFixed(2)}</p></div>
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Venue Payout</p><p className="text-2xl font-bold text-foreground mt-1">${venuePayout.toFixed(2)}</p></div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Coupon</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Title</Label><Input value={(form.title as string) || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={(form.description as string) || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Price ($)</Label><Input type="number" step="0.01" value={form.price ?? ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
              <div><Label>Original Price ($)</Label><Input type="number" step="0.01" value={form.original_price ?? ""} onChange={(e) => setForm({ ...form, original_price: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Qty Available</Label><Input type="number" value={form.quantity_available ?? ""} onChange={(e) => setForm({ ...form, quantity_available: Number(e.target.value) })} /></div>
            <div><Label>Pickup Address</Label><Input value={(form.pickup_address as string) || ""} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} /></div>
            <Button className="w-full" onClick={() => updateCoupon.mutate()} disabled={updateCoupon.isPending}>
              {updateCoupon.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
