import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Package, Leaf, DollarSign, BarChart3, Plus, Pencil, Store } from "lucide-react";
import OnboardingChecklist from "@/components/venue/OnboardingChecklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { FoodListing, Coupon, Location, FoodType, ListingStatus } from "@/types/database";

const FOOD_TYPES: { value: FoodType; label: string }[] = [
  { value: "prepared_meals", label: "Prepared Meals" },
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy" },
  { value: "meat_protein", label: "Meat / Protein" },
  { value: "baked_goods", label: "Baked Goods" },
  { value: "shelf_stable", label: "Shelf Stable" },
  { value: "frozen", label: "Frozen" },
];

const emptyDonation = {
  food_type: "prepared_meals" as FoodType,
  pounds: "",
  estimated_donation_value: "",
  pickup_address: "",
  pickup_window_start: "",
  pickup_window_end: "",
  notes: "",
};

const emptyCoupon = {
  title: "",
  description: "",
  price: "",
  original_price: "",
  quantity_available: "",
  pickup_address: "",
};

export default function VenueDashboard() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [donationDialogOpen, setDonationDialogOpen] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [donationForm, setDonationForm] = useState(emptyDonation);
  const [couponForm, setCouponForm] = useState(emptyCoupon);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const { data: locations = [], isLoading: locsLoading } = useQuery({
    queryKey: ["venue-locations", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("organization_id", profile!.organization_id!);
      if (error) throw error;
      return data as Location[];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["venue-listings", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("organization_id", profile!.organization_id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ["venue-coupons", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").eq("organization_id", profile!.organization_id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!profile?.organization_id,
  });

  const createDonation = useMutation({
    mutationFn: async () => {
      const locId = selectedLocationId || locations[0]?.id;
      if (!locId || !profile?.organization_id) throw new Error("No location selected");
      const loc = locations.find((l) => l.id === locId);
      const { error } = await supabase.from("food_listings").insert({
        location_id: locId,
        organization_id: profile.organization_id,
        listing_type: "donation" as const,
        food_type: donationForm.food_type,
        pounds: donationForm.pounds ? Number(donationForm.pounds) : null,
        estimated_donation_value: donationForm.estimated_donation_value ? Number(donationForm.estimated_donation_value) : null,
        pickup_address: donationForm.pickup_address || loc?.pickup_address || null,
        pickup_window_start: donationForm.pickup_window_start || null,
        pickup_window_end: donationForm.pickup_window_end || null,
        notes: donationForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-listings"] });
      toast.success("Donation posted!");
      setDonationDialogOpen(false);
      setDonationForm(emptyDonation);
    },
    onError: (e) => toast.error(e.message),
  });

  const createCoupon = useMutation({
    mutationFn: async () => {
      const locId = selectedLocationId || locations[0]?.id;
      if (!locId || !profile?.organization_id) throw new Error("No location selected");
      const loc = locations.find((l) => l.id === locId);
      const { error } = await supabase.from("coupons").insert({
        location_id: locId,
        organization_id: profile.organization_id,
        title: couponForm.title,
        description: couponForm.description || null,
        price: Number(couponForm.price),
        original_price: couponForm.original_price ? Number(couponForm.original_price) : null,
        quantity_available: Number(couponForm.quantity_available),
        pickup_address: couponForm.pickup_address || loc?.pickup_address || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-coupons"] });
      toast.success("Coupon created!");
      setCouponDialogOpen(false);
      setCouponForm(emptyCoupon);
    },
    onError: (e) => toast.error(e.message),
  });

  if (locsLoading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;
  if (!profile?.organization_id || locations.length === 0) return <Navigate to="/venue/onboarding" replace />;

  const donations = listings.filter((l) => l.listing_type === "donation");
  const totalPounds = donations.reduce((s, l) => s + (l.pounds || 0), 0);
  const totalValue = donations.reduce((s, l) => s + (l.estimated_donation_value || 0), 0);
  const activeDonations = donations.filter((l) => ["posted", "claimed", "picked_up"].includes(l.status)).length;
  const activeCoupons = coupons.filter((c) => c.status === "active").length;
  const couponRevenue = coupons.reduce((s, c) => s + c.price * c.quantity_sold, 0);
  const co2 = totalPounds * 3.8;
  const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Venue Partner Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your food listings, coupons, and impact</p>
          </div>
        </div>

        <OnboardingChecklist />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" />Active Donations</p>
            <p className="text-3xl font-bold text-foreground mt-2">{activeDonations}</p>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Leaf className="w-4 h-4" />Pounds Diverted</p>
            <p className="text-3xl font-bold text-foreground mt-2">{totalPounds.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" />Donation Value</p>
            <p className="text-3xl font-bold text-foreground mt-2">${totalValue.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" />CO₂ Prevented</p>
            <p className="text-3xl font-bold text-foreground mt-2">{co2.toLocaleString()} lbs</p>
          </div>
        </div>

        <Tabs defaultValue="donations">
          <TabsList>
            <TabsTrigger value="donations">Donations ({donations.length})</TabsTrigger>
            <TabsTrigger value="coupons">Marketplace Coupons ({coupons.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="donations" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => { setDonationForm(emptyDonation); setSelectedLocationId(locations[0]?.id || ""); setDonationDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />Post Donation
              </Button>
            </div>
            <div className="bg-card rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Food Type</TableHead>
                    <TableHead>Pounds</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donations.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No donations posted yet. Click "Post Donation" to get started.</TableCell></TableRow>
                  ) : donations.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{locMap[d.location_id] || "—"}</TableCell>
                      <TableCell className="capitalize">{d.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                      <TableCell>{d.pounds || "—"}</TableCell>
                      <TableCell>{d.estimated_donation_value ? `$${d.estimated_donation_value}` : "—"}</TableCell>
                      <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${d.status === "posted" ? "bg-chart-1/15 text-chart-1" : d.status === "completed" ? "bg-success/15 text-success" : "bg-chart-4/15 text-chart-4"}`}>{formatStatus(d.status)}</span></TableCell>
                      <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="coupons" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Active Coupons</p><p className="text-lg font-bold text-foreground">{activeCoupons}</p></div>
                <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Total Sold</p><p className="text-lg font-bold text-foreground">{coupons.reduce((s, c) => s + c.quantity_sold, 0)}</p></div>
                <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-lg font-bold text-foreground">${couponRevenue.toFixed(2)}</p></div>
              </div>
              <Button onClick={() => { setCouponForm(emptyCoupon); setSelectedLocationId(locations[0]?.id || ""); setCouponDialogOpen(true); }}>
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
          </TabsContent>
        </Tabs>

        {/* Post Donation Dialog */}
        <Dialog open={donationDialogOpen} onOpenChange={setDonationDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Post a Donation</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              {locations.length > 1 && (
                <div>
                  <Label>Location</Label>
                  <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Food Type</Label>
                <Select value={donationForm.food_type} onValueChange={(v) => setDonationForm({ ...donationForm, food_type: v as FoodType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FOOD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Pounds</Label><Input type="number" value={donationForm.pounds} onChange={(e) => setDonationForm({ ...donationForm, pounds: e.target.value })} /></div>
                <div><Label>Est. Value ($)</Label><Input type="number" step="0.01" value={donationForm.estimated_donation_value} onChange={(e) => setDonationForm({ ...donationForm, estimated_donation_value: e.target.value })} /></div>
              </div>
              <div><Label>Pickup Address</Label><Input value={donationForm.pickup_address} onChange={(e) => setDonationForm({ ...donationForm, pickup_address: e.target.value })} placeholder="Defaults to location address" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Pickup Start</Label><Input type="datetime-local" value={donationForm.pickup_window_start} onChange={(e) => setDonationForm({ ...donationForm, pickup_window_start: e.target.value })} /></div>
                <div><Label>Pickup End</Label><Input type="datetime-local" value={donationForm.pickup_window_end} onChange={(e) => setDonationForm({ ...donationForm, pickup_window_end: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={donationForm.notes} onChange={(e) => setDonationForm({ ...donationForm, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={() => createDonation.mutate()} disabled={createDonation.isPending}>
                {createDonation.isPending ? "Posting..." : "Post Donation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Coupon Dialog */}
        <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Marketplace Coupon</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              {locations.length > 1 && (
                <div>
                  <Label>Location</Label>
                  <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>Title *</Label><Input value={couponForm.title} onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={couponForm.description} onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Price ($) *</Label><Input type="number" step="0.01" value={couponForm.price} onChange={(e) => setCouponForm({ ...couponForm, price: e.target.value })} /></div>
                <div><Label>Original Price ($)</Label><Input type="number" step="0.01" value={couponForm.original_price} onChange={(e) => setCouponForm({ ...couponForm, original_price: e.target.value })} /></div>
              </div>
              <div><Label>Quantity Available *</Label><Input type="number" value={couponForm.quantity_available} onChange={(e) => setCouponForm({ ...couponForm, quantity_available: e.target.value })} /></div>
              <div><Label>Pickup Address</Label><Input value={couponForm.pickup_address} onChange={(e) => setCouponForm({ ...couponForm, pickup_address: e.target.value })} placeholder="Defaults to location address" /></div>
              <Button className="w-full" onClick={() => createCoupon.mutate()} disabled={!couponForm.title || !couponForm.price || !couponForm.quantity_available || createCoupon.isPending}>
                {createCoupon.isPending ? "Creating..." : "Create Coupon"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}