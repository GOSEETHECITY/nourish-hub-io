import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Leaf, Package, BarChart3, Store, Pencil, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { LOCATION_TYPES } from "@/lib/constants";
import { Switch } from "@/components/ui/switch";
import type { Location, FoodListing, SustainabilityBaseline, ImpactReport, Coupon, Profile } from "@/types/database";
import AddLocationUserDialog from "@/components/invitations/AddLocationUserDialog";

function formatStripeStatus(status: string | null): string {
  if (!status || status === "not_started") return "Not Started";
  if (status === "connected" || status === "complete") return "Connected";
  if (status === "pending" || status === "pending_verification") return "Pending Verification";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LocationDetail() {
  const { id, locationId } = useParams<{ id: string; locationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [locUserDialogOpen, setLocUserDialogOpen] = useState(false);

  const { data: location } = useQuery({
    queryKey: ["location", locationId],
    queryFn: async () => { const { data, error } = await supabase.from("locations").select("*").eq("id", locationId!).single(); if (error) throw error; return data as Location; },
    enabled: !!locationId,
  });

  const { data: baseline } = useQuery({
    queryKey: ["location-baseline", locationId],
    queryFn: async () => { const { data, error } = await supabase.from("sustainability_baseline").select("*").eq("location_id", locationId!).maybeSingle(); if (error) throw error; return data as SustainabilityBaseline | null; },
    enabled: !!locationId,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["location-listings", locationId],
    queryFn: async () => { const { data, error } = await supabase.from("food_listings").select("*").eq("location_id", locationId!).order("created_at", { ascending: false }); if (error) throw error; return data as FoodListing[]; },
    enabled: !!locationId,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["location-reports", locationId],
    queryFn: async () => { const listingIds = listings.map((l) => l.id); if (!listingIds.length) return []; const { data, error } = await supabase.from("impact_reports").select("*").in("food_listing_id", listingIds); if (error) throw error; return data as ImpactReport[]; },
    enabled: listings.length > 0,
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ["location-coupons", locationId],
    queryFn: async () => { const { data, error } = await supabase.from("coupons").select("*").eq("location_id", locationId!).order("created_at", { ascending: false }); if (error) throw error; return data as Coupon[]; },
    enabled: !!locationId,
  });

  const { data: locationUsers = [] } = useQuery({
    queryKey: ["location-users", locationId],
    queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*").eq("location_id", locationId!); if (error) throw error; return data as Profile[]; },
    enabled: !!locationId,
  });

  const updateLocation = useMutation({
    mutationFn: async () => {
      const { different_pickup, ...payload } = form;
      if (!different_pickup) payload.pickup_address = [payload.address, payload.city, payload.state].filter(Boolean).join(", ");
      const { error } = await supabase.from("locations").update(payload).eq("id", locationId!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["location", locationId] }); toast.success("Location updated"); setEditOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const toggleMarketplace = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.from("locations").update({ marketplace_enabled: enabled }).eq("id", locationId!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["location", locationId] }); toast.success("Marketplace access updated"); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = () => {
    if (!location) return;
    const hasDifferentPickup = !!(location.pickup_address && location.pickup_address !== [location.address, location.city, location.state].filter(Boolean).join(", "));
    setForm({
      name: location.name, location_type: (location as any).location_type || "",
      address: location.address, city: location.city, state: location.state,
      zip: location.zip, county: location.county, pickup_address: location.pickup_address,
      pickup_instructions: location.pickup_instructions, hours_of_operation: location.hours_of_operation,
      estimated_surplus_frequency: location.estimated_surplus_frequency, different_pickup: hasDifferentPickup,
    });
    setEditOpen(true);
  };

  if (!location) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;

  const totalPounds = listings.reduce((s, l) => s + (l.pounds || 0), 0);
  const totalMeals = reports.reduce((s, r) => s + (r.meals_served || 0), 0);
  const totalValue = listings.reduce((s, l) => s + (l.estimated_donation_value || 0), 0);
  const co2Prevented = totalPounds * 3.8;
  const totalRevenue = coupons.reduce((s, c) => s + c.price * c.quantity_sold, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/organizations/${id}`)}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{location.name}</h1>
          <p className="text-sm text-muted-foreground">{[location.address, location.city, location.state].filter(Boolean).join(", ")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={openEdit}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
      </div>

      {/* Location Profile */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><MapPin className="w-5 h-5" />Location Profile</h2>
        <div className="grid grid-cols-3 gap-6">
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Name</p><p className="text-sm font-medium text-foreground mt-1">{location.name}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Location Type</p><p className="text-sm text-foreground mt-1">{(location as any).location_type || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Address</p><p className="text-sm text-foreground mt-1">{[location.address, location.city, location.state, location.zip].filter(Boolean).join(", ")}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">County</p><p className="text-sm text-foreground mt-1">{location.county || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pickup Address</p><p className="text-sm text-foreground mt-1">{location.pickup_address || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pickup Instructions</p><p className="text-sm text-foreground mt-1">{location.pickup_instructions || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Hours</p><p className="text-sm text-foreground mt-1">{location.hours_of_operation || "—"}</p></div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Marketplace Access</p>
            <div className="flex items-center gap-2 mt-1">
              <Switch checked={location.marketplace_enabled} onCheckedChange={(v) => toggleMarketplace.mutate(v)} />
              <span className={`text-xs font-medium ${location.marketplace_enabled ? "text-green-600" : "text-muted-foreground"}`}>{location.marketplace_enabled ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Stripe Status</p><p className="text-sm text-foreground mt-1">{formatStripeStatus(location.stripe_onboarding_status)}</p></div>
        </div>
      </section>

      {/* Location Users */}
      <section className="bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Users className="w-5 h-5" />Location Users ({locationUsers.length})</h2>
          <Button size="sm" onClick={() => setLocUserDialogOpen(true)}><UserPlus className="w-4 h-4 mr-1" />Add Location User</Button>
        </div>
        {locationUsers.length === 0 ? <p className="text-sm text-muted-foreground">No users associated with this location.</p> : (
          <Table><TableHeader><TableRow><TableHead>First Name</TableHead><TableHead>Last Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead></TableRow></TableHeader>
          <TableBody>{locationUsers.map((u) => (<TableRow key={u.id}><TableCell>{u.first_name || "—"}</TableCell><TableCell>{u.last_name || "—"}</TableCell><TableCell>{u.email || "—"}</TableCell><TableCell>{u.phone || "—"}</TableCell></TableRow>))}</TableBody></Table>
        )}
      </section>

      {/* Sustainability Baseline */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><Leaf className="w-5 h-5" />Sustainability Baseline</h2>
        {!baseline ? <p className="text-sm text-muted-foreground">No baseline data submitted.</p> : (
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Generates Surplus</p><p className="text-sm text-foreground mt-1">{baseline.generates_surplus ? "Yes" : "No"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Daily Surplus</p><p className="text-sm text-foreground mt-1">{baseline.estimated_daily_surplus || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Surplus Types</p><p className="text-sm text-foreground mt-1">{baseline.surplus_types?.join(", ") || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Current Handling</p><p className="text-sm text-foreground mt-1">{baseline.current_handling || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Donation Frequency</p><p className="text-sm text-foreground mt-1">{baseline.donation_frequency || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Priority Outcomes</p><p className="text-sm text-foreground mt-1">{baseline.priority_outcomes?.join(", ") || "—"}</p></div>
          </div>
        )}
      </section>

      {/* Donation History */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><Package className="w-5 h-5" />Donation History ({listings.length})</h2>
        {listings.length === 0 ? <p className="text-sm text-muted-foreground">No donations yet.</p> : (
          <Table><TableHeader><TableRow><TableHead>Food Type</TableHead><TableHead>Pounds</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>{listings.map((l) => (<TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/food-listings/donations/${l.id}`)}><TableCell className="capitalize">{l.food_type?.replace(/_/g, " ") || "—"}</TableCell><TableCell>{l.pounds || "—"}</TableCell><TableCell className="capitalize">{l.status.replace(/_/g, " ")}</TableCell><TableCell>{new Date(l.created_at).toLocaleDateString()}</TableCell></TableRow>))}</TableBody></Table>
        )}
      </section>

      {/* Impact */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5" />Impact Metrics</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Pounds</p><p className="text-2xl font-bold text-foreground mt-1">{totalPounds.toLocaleString()}</p></div>
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Meals</p><p className="text-2xl font-bold text-foreground mt-1">{totalMeals.toLocaleString()}</p></div>
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Est. Value</p><p className="text-2xl font-bold text-foreground mt-1">${totalValue.toLocaleString()}</p></div>
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">CO₂ Prevented</p><p className="text-2xl font-bold text-foreground mt-1">{co2Prevented.toLocaleString()} lbs</p></div>
        </div>
      </section>

      {/* Marketplace */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><Store className="w-5 h-5" />Marketplace Sales</h2>
        {!location.marketplace_enabled ? <p className="text-sm text-muted-foreground">Marketplace not enabled.</p> : coupons.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet.</p> : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold text-foreground mt-1">${totalRevenue.toFixed(2)}</p></div>
              <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Platform Fee ({location.platform_fee_percentage}%)</p><p className="text-xl font-bold text-foreground mt-1">${(totalRevenue * location.platform_fee_percentage / 100).toFixed(2)}</p></div>
              <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Venue Payout</p><p className="text-xl font-bold text-foreground mt-1">${(totalRevenue * (1 - location.platform_fee_percentage / 100)).toFixed(2)}</p></div>
            </div>
            <Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Price</TableHead><TableHead>Sold</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{coupons.map((c) => (<TableRow key={c.id}><TableCell className="font-medium">{c.title}</TableCell><TableCell>${c.price.toFixed(2)}</TableCell><TableCell>{c.quantity_sold} / {c.quantity_available}</TableCell><TableCell className="capitalize">{c.status.replace(/_/g, " ")}</TableCell></TableRow>))}</TableBody></Table>
          </>
        )}
      </section>

      {/* Edit Location Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Location</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Location Name *</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Location Type</Label>
              <Select value={form.location_type || ""} onValueChange={(v) => setForm({ ...form, location_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{LOCATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Address</Label><Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div><Label>ZIP</Label><Input value={form.zip || ""} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div><Label>County</Label><Input value={form.county || ""} onChange={(e) => setForm({ ...form, county: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.different_pickup || false} onCheckedChange={(v) => setForm({ ...form, different_pickup: !!v })} />
              My pickup address is different from my location address
            </label>
            {form.different_pickup && <div><Label>Pickup Address</Label><Input value={form.pickup_address || ""} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} /></div>}
            <div><Label>Pickup Instructions</Label><Input value={form.pickup_instructions || ""} onChange={(e) => setForm({ ...form, pickup_instructions: e.target.value })} /></div>
            <div><Label>Hours of Operation</Label><Input value={form.hours_of_operation || ""} onChange={(e) => setForm({ ...form, hours_of_operation: e.target.value })} /></div>
            <div><Label>Estimated Surplus Frequency</Label><Input value={form.estimated_surplus_frequency || ""} onChange={(e) => setForm({ ...form, estimated_surplus_frequency: e.target.value })} /></div>
            <Button className="w-full" onClick={() => updateLocation.mutate()} disabled={!form.name || updateLocation.isPending}>
              {updateLocation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddLocationUserDialog open={locUserDialogOpen} onOpenChange={setLocUserDialogOpen} locationId={locationId!} locationType="venue" locationName={location?.name || "Location"} invalidateKey={["location-users", locationId!]} />
    </div>
  );
}
