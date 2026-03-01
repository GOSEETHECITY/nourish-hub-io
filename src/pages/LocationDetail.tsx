import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Leaf, Package, BarChart3, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Location, FoodListing, SustainabilityBaseline, ImpactReport, Coupon } from "@/types/database";

export default function LocationDetail() {
  const { id, locationId } = useParams<{ id: string; locationId: string }>();
  const navigate = useNavigate();

  const { data: location } = useQuery({
    queryKey: ["location", locationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("id", locationId!).single();
      if (error) throw error;
      return data as Location;
    },
    enabled: !!locationId,
  });

  const { data: baseline } = useQuery({
    queryKey: ["location-baseline", locationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sustainability_baseline").select("*").eq("location_id", locationId!).maybeSingle();
      if (error) throw error;
      return data as SustainabilityBaseline | null;
    },
    enabled: !!locationId,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["location-listings", locationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("location_id", locationId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!locationId,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["location-reports", locationId],
    queryFn: async () => {
      const listingIds = listings.map((l) => l.id);
      if (!listingIds.length) return [];
      const { data, error } = await supabase.from("impact_reports").select("*").in("food_listing_id", listingIds);
      if (error) throw error;
      return data as ImpactReport[];
    },
    enabled: listings.length > 0,
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ["location-coupons", locationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").eq("location_id", locationId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!locationId,
  });

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
        <div>
          <h1 className="text-2xl font-bold text-foreground">{location.name}</h1>
          <p className="text-sm text-muted-foreground">{[location.address, location.city, location.state].filter(Boolean).join(", ")}</p>
        </div>
      </div>

      {/* Section 1 - Location Profile */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><MapPin className="w-5 h-5" />Location Profile</h2>
        <div className="grid grid-cols-3 gap-6">
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Name</p><p className="text-sm font-medium text-foreground mt-1">{location.name}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Address</p><p className="text-sm text-foreground mt-1">{[location.address, location.city, location.state, location.zip].filter(Boolean).join(", ")}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">County</p><p className="text-sm text-foreground mt-1">{location.county || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pickup Address</p><p className="text-sm text-foreground mt-1">{location.pickup_address || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pickup Instructions</p><p className="text-sm text-foreground mt-1">{location.pickup_instructions || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Hours</p><p className="text-sm text-foreground mt-1">{location.hours_of_operation || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Surplus Frequency</p><p className="text-sm text-foreground mt-1">{location.estimated_surplus_frequency || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Marketplace</p><span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-medium ${location.marketplace_enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{location.marketplace_enabled ? "Enabled" : "Disabled"}</span></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Stripe Status</p><p className="text-sm text-foreground mt-1">{location.stripe_onboarding_status || "Not started"}</p></div>
        </div>
      </section>

      {/* Section 2 - Sustainability Baseline */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><Leaf className="w-5 h-5" />Sustainability Baseline</h2>
        {!baseline ? (
          <p className="text-sm text-muted-foreground">No baseline data submitted.</p>
        ) : (
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

      {/* Section 3 - Donation History */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><Package className="w-5 h-5" />Donation History ({listings.length})</h2>
        {listings.length === 0 ? <p className="text-sm text-muted-foreground">No donations yet.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Food Type</TableHead><TableHead>Pounds</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {listings.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/food-listings/donations/${l.id}`)}>
                  <TableCell className="capitalize">{l.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                  <TableCell>{l.pounds || "—"}</TableCell>
                  <TableCell className="capitalize">{l.status.replace(/_/g, " ")}</TableCell>
                  <TableCell>{new Date(l.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Section 4 - Impact Metrics */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5" />Impact Metrics</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Pounds</p><p className="text-2xl font-bold text-foreground mt-1">{totalPounds.toLocaleString()}</p></div>
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Meals</p><p className="text-2xl font-bold text-foreground mt-1">{totalMeals.toLocaleString()}</p></div>
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Est. Value</p><p className="text-2xl font-bold text-foreground mt-1">${totalValue.toLocaleString()}</p></div>
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">CO₂ Prevented</p><p className="text-2xl font-bold text-foreground mt-1">{co2Prevented.toLocaleString()} lbs</p></div>
        </div>
      </section>

      {/* Section 5 - Marketplace Sales */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><Store className="w-5 h-5" />Marketplace Sales</h2>
        {!location.marketplace_enabled ? (
          <p className="text-sm text-muted-foreground">Marketplace not enabled for this location.</p>
        ) : coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No marketplace sales yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold text-foreground mt-1">${totalRevenue.toFixed(2)}</p></div>
              <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Platform Fee ({location.platform_fee_percentage}%)</p><p className="text-xl font-bold text-foreground mt-1">${(totalRevenue * location.platform_fee_percentage / 100).toFixed(2)}</p></div>
              <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Venue Payout</p><p className="text-xl font-bold text-foreground mt-1">${(totalRevenue * (1 - location.platform_fee_percentage / 100)).toFixed(2)}</p></div>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Price</TableHead><TableHead>Sold</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>${c.price.toFixed(2)}</TableCell>
                    <TableCell>{c.quantity_sold} / {c.quantity_available}</TableCell>
                    <TableCell className="capitalize">{c.status.replace(/_/g, " ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </section>
    </div>
  );
}
