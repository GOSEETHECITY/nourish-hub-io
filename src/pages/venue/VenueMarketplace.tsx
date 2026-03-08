import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { MARKETPLACE_ELIGIBLE_TYPES } from "@/lib/marketplace";
import type { Coupon, Location } from "@/types/database";

const emptyCoupon = { title: "", description: "", price: "", original_price: "", quantity_available: "", pickup_address: "" };

export default function VenueMarketplace() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyCoupon);
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const { data: locations = [] } = useQuery({
    queryKey: ["venue-locations", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("organization_id", profile!.organization_id!);
      if (error) throw error;
      return data as Location[];
    },
    enabled: !!profile?.organization_id,
  });

  // Check if any location is marketplace eligible
  const eligibleLocations = useMemo(() => 
    locations.filter((l) => l.marketplace_enabled || MARKETPLACE_ELIGIBLE_TYPES.includes((l as any).location_type || "")),
    [locations]
  );

  const hasEligible = eligibleLocations.length > 0;

  const { data: coupons = [] } = useQuery({
    queryKey: ["venue-coupons", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").eq("organization_id", profile!.organization_id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!profile?.organization_id,
  });

  const createCoupon = useMutation({
    mutationFn: async () => {
      const locId = selectedLocationId || eligibleLocations[0]?.id;
      if (!locId || !profile?.organization_id) throw new Error("No location selected");
      const loc = locations.find((l) => l.id === locId);
      const { error } = await supabase.from("coupons").insert({
        location_id: locId, organization_id: profile.organization_id,
        title: form.title, description: form.description || null,
        price: Number(form.price), original_price: form.original_price ? Number(form.original_price) : null,
        quantity_available: Number(form.quantity_available),
        pickup_address: form.pickup_address || loc?.pickup_address || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-coupons"] });
      toast.success("Coupon created!");
      setDialogOpen(false);
      setForm(emptyCoupon);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!hasEligible) return null; // Should not render if not eligible (hidden by nav)

  const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
  const activeCoupons = coupons.filter((c) => c.status === "active").length;
  const couponRevenue = coupons.reduce((s, c) => s + c.price * c.quantity_sold, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage surplus food coupons for the GO See The City app</p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-card rounded-xl border p-8 text-center space-y-4">
        <Rocket className="w-12 h-12 text-primary mx-auto" />
        <h2 className="text-xl font-bold text-foreground">🚀 Marketplace Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The HarietAI Marketplace is launching soon on the GO See The City app. Connect your Stripe account now so you're ready to start selling the moment it goes live.
        </p>
        <Button variant="outline" className="mx-auto">Connect Stripe</Button>
      </div>

      {/* Existing Coupons */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-5"><p className="text-xs text-muted-foreground">Active Coupons</p><p className="text-lg font-bold text-foreground">{activeCoupons}</p></div>
        <div className="bg-card rounded-xl border p-5"><p className="text-xs text-muted-foreground">Total Sold</p><p className="text-lg font-bold text-foreground">{coupons.reduce((s, c) => s + c.quantity_sold, 0)}</p></div>
        <div className="bg-card rounded-xl border p-5"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-lg font-bold text-foreground">${couponRevenue.toFixed(2)}</p></div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { setForm(emptyCoupon); setSelectedLocationId(eligibleLocations[0]?.id || ""); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Create Coupon
        </Button>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Sold / Available</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No coupons created yet.</TableCell></TableRow>
            ) : coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{locMap[c.location_id] || "—"}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>${c.price.toFixed(2)}</TableCell>
                <TableCell>{c.quantity_sold} / {c.quantity_available}</TableCell>
                <TableCell className="capitalize"><span className={`px-2.5 py-0.5 text-xs font-semibold rounded ${c.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{c.status.replace(/_/g, " ")}</span></TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Marketplace Coupon</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            {eligibleLocations.length > 1 && (
              <div>
                <Label>Location</Label>
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{eligibleLocations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Price ($) *</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><Label>Original Price ($)</Label><Input type="number" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} /></div>
            </div>
            <div><Label>Quantity Available *</Label><Input type="number" value={form.quantity_available} onChange={(e) => setForm({ ...form, quantity_available: e.target.value })} /></div>
            <div><Label>Pickup Address</Label><Input value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} placeholder="Defaults to location address" /></div>
            <Button className="w-full" onClick={() => createCoupon.mutate()} disabled={!form.title || !form.price || !form.quantity_available || createCoupon.isPending}>
              {createCoupon.isPending ? "Creating..." : "Create Coupon"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
