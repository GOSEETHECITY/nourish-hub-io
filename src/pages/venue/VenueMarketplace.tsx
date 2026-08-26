import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MARKETPLACE_ELIGIBLE_TYPES } from "@/lib/marketplace";
import type { Coupon, Location } from "@/types/database";

export default function VenueMarketplace() {
  const { profile } = useAuth();

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
        <h2 className="text-xl font-bold text-foreground">Marketplace Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The HarietAI Marketplace is launching soon on the GO See The City app. Selling and Stripe connection are turned off until it goes live.
        </p>
        <Button variant="outline" className="mx-auto" disabled>Connect Stripe</Button>
        <p className="text-xs text-muted-foreground">Available when the marketplace launches</p>
      </div>

      <div className="opacity-50 pointer-events-none select-none space-y-6" aria-disabled="true">
      {/* Existing Coupons */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-5"><p className="text-xs text-muted-foreground">Active Coupons</p><p className="text-lg font-bold text-foreground">{activeCoupons}</p></div>
        <div className="bg-card rounded-xl border p-5"><p className="text-xs text-muted-foreground">Total Sold</p><p className="text-lg font-bold text-foreground">{coupons.reduce((s, c) => s + c.quantity_sold, 0)}</p></div>
        <div className="bg-card rounded-xl border p-5"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-lg font-bold text-foreground">${couponRevenue.toFixed(2)}</p></div>
      </div>

      <div className="flex justify-end">
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />Create Coupon
        </Button>
      </div>


      <div className="bg-card rounded-xl border">
        <div className="overflow-x-auto"><Table>
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
        </Table></div>
      </div>
      </div>

    </div>
  );
}
